const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Realm = require('realm');
const markdown = require('markdown').markdown;


const INSTANCE_ADDRESS = "119.23.41.35:9080";
const REALM_BASE_URL = "realm://"+INSTANCE_ADDRESS;


// const Post ={
//   name : 'Post',
//   properties:{
//     id:"string",
//     post_author:"string",
//     post_content:"string",
//     post_title:"string",
//     post_status:"string",
//     post_date: "date",
//   }
// }

const newPost ={
  name: 'Post',
  properties: {
    id: 'string',
    post_author: 'string',
    post_content: 'string',
    post_title: 'string',
    post_status: 'string',
    post_date: 'date',
    tag:  {type: 'list', objectType: 'Tag'}
  }
}
const Tag = {
  name: 'Tag',
  primaryKey: 'uuid',
  properties: {
    uuid: 'string',
    name: 'string'
  }
}


function uuid() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}

function isIn(e,tags){
  for(const key in tags){
    if(e == tags[key].name)
      return true;
  }
  return false;
}

app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended: true}));

app.post("/",function(req,res){

  getRealm()
    .then(realm =>{

      var posts = realm.objects('Post').sorted('post_title');
      var tags = realm.objects('Tag');
      var cTag = req.body.currentTag;
      var sSelect = cTag != null && cTag != 'all';
      var p = posts.filtered('id = "'+req.body.id+'"');
      if(sSelect){
        console.log("filtered posts by tag");
        posts = posts.filtered("ANY tag.name = '"+cTag+"'");

      }



      var renderTitle;
      var renderContent;
      var renderId;
      var renderTags;
      var renderStatus;




      if(req.body.mode == 'save'){
        console.log("do save");


        try {
          var sendtags = req.body.tags.split(",");
          realm.write(() => {

            //save and update tags
            for(const key in sendtags){
              if(sendtags[key] != "" && !isIn(sendtags[key],tags)){
                realm.create("Tag",{
                  uuid :uuid(),
                  name :sendtags[key]
                });
              }
            }


            if(p.length > 0){
              var oldP = p[0];
              oldP.post_title = req.body.title;
              oldP.post_content = req.body.content;
              while(oldP.tag.length != 0)
                oldP.tag.pop();
              for(const k in tags){

                var tag = tags[k];
                for(const key in sendtags){
                  if(sendtags[key] == tag.name  ){

                    // var sP = true;
                    // for(const a in oldP.tag){
                    //   if(oldP.tag[a].name == tag.name)
                    //     sP = false;
                    // }
                    // if(sP){
                      oldP.tag.push(tag);
                    //   console.log("push in");
                    // } else{
                    //   console.log("do not push in "+ tag.name);
                    // }
                  }
                }
              }
            } else{
              let tempPost = realm.create("Post",{
                id : req.body.id,
                post_title: req.body.title,
                post_author: "kf",
                post_content: req.body.content,
                post_date :new Date(),
                post_status:"",
                tag:[]
              });
              for(const k in tags){
                var tag = tags[k];
                for(const key in sendtags){
                  if(sendtags[key] == tag.name  ){
                    var sP = true;

                    for(const a in tempPost.tag){
                      if(tempPost.tag[a].name == tag.name)
                        sP = false;
                    }
                    if(sP){
                      tempPost.tag.push(tag);
                      console.log("push in");
                    } else{
                      console.log("do not push in "+ tag.name);
                    }
                  }
                }

              }
            }
              renderId = req.body.id;
              renderTitle = req.body.title;
              renderContent = req.body.content;
              renderTags = req.body.tags;
            });

        } catch (e) {
          console.log(e);
        }

      } else if(req.body.mode == 'write'){

        console.log("write");

        if(p.length > 0){

          renderId =p[0].id;
          renderTitle = p[0].post_title;
          renderContent = p[0].post_content;
          renderTags = "";
          for(var i = 0 ; i< p[0].tag.length;i++)
             renderTags = renderTags+p[0].tag[i].name+",";
        } else {
          renderId = uuid();
          renderTitle = "title";
          renderContent = "content";
          renderTags = "";

        }


      } else if(req.body.mode == 'delete'){
        console.log("try delete "+ req.body.id +" : "+req.body.title);
        if(p.length > 0){
          realm.write(() => {
            realm.delete(p);
          });
        }

        renderId = uuid();
        renderTitle = "title";
        renderContent = "content";
        renderTags = "";

        console.log("delete success");
      }

      res.render('index.ejs', {

        post:{
          id:renderId,
          post_title:renderTitle,
          post_content:renderContent,
          tags:renderTags,
          md:markdown.toHTML( renderContent )
        },
        posts: posts,
        tags :tags,
        currentTag:cTag
      });

    }).catch(error =>{
      console.log(error);
    });


});

app.get('/', function (req, res) {
  getRealm()
      .then(realm =>{
        var posts = realm.objects('Post');
        var tags = realm.objects('Tag');

        res.render('index.ejs',{
          post:{
          id : uuid(),
          post_title:"title",
          post_content:"content"
          },
          posts :posts,
          tags : tags,
          currentTag:"all"
        });

       }).catch(error => {
           console.log(error);
       });
});

function getRealm(){
  var user =  Realm.Sync.User.current;
  var serverUrl  = REALM_BASE_URL +"/"+user.identity+"/post";
  var config  = {
    sync:{
      user:user,
      url:serverUrl
    },
    schema:[newPost,Tag],
    schemaVersion: 2
  };
    return  Realm.open(config);

}

function login(){
    // var users = Realm.Sync.User.all;
    // for(const key in users){
    //   const u = users[key];
    //   u.logout();
    // }

    Realm.Sync.User.login('http://119.23.41.35:9080', 'kf', 'kfdykme').then(user => {

        getRealm().then(realm => {

           console.log("login success");

          })
          .catch(error => {
            console.log(error);
          });

    }).catch(error => {
      console.log(error);
    });
}

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Funk listening at http://%s:%s', host, port);
  login();
});
