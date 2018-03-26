const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Realm = require('realm');
const markdown = require('markdown').markdown;


const INSTANCE_ADDRESS = "119.23.41.35:9080";
const REALM_BASE_URL = "realm://"+INSTANCE_ADDRESS;


const Post ={
  name : 'Post',
  properties:{
    id:"string",
    post_author:"string",
    post_content:"string",
    post_title:"string",
    post_status:"string",
    post_date: "date",
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


app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended: true}));

app.post("/",function(req,res){
  if(req.body.mode == 'save'){
    console.log("do save");

        getRealm()
          .then(realm =>{
             var post = realm.objects('Post');
              var p = post.filtered('id = "'+req.body.id+'"');

              realm.write(() => {
                if(p.length > 0){
                  var oldP = p[0];
                  oldP.post_title = req.body.title;
                  oldP.post_content = req.body.content;
                } else
                realm.create("Post",{
                  id : req.body.id,
                  post_title: req.body.title,
                  post_author: "kf",
                  post_content: req.body.content,
                  post_date :new Date(),
                  post_status:""
                });


                res.render('index.ejs', {post:{
                  id:req.body.id,
                  post_title:req.body.title,
                  post_content:req.body.content,
                  md:markdown.toHTML( req.body.content )
                },
                posts: post,});

            });
          }).catch(error =>{
            console.log(error);
          });
  } else if(req.body.mode == 'write'){
    console.log("write");
    getRealm()
        .then(realm =>{
          var posts = realm.objects('Post');
          var post = realm.objects('Post');
           var p = realm.objects('Post').filtered('id = "'+req.body.id+'"');

           if(p.length > 0){
             res.render('index.ejs', {post:{
               id:p[0].id,
               post_title:p[0].post_title,
               post_content:p[0].post_content,
               md:markdown.toHTML(p[0].post_content )
             },
             posts: post,});
           } else {
             res.render('index.ejs',{
               post:{
               id : uuid(),
               post_title:"title",
               post_content:"content" ,
               md:markdown.toHTML("content" )
               },
               posts :posts,
             });
           }


         }).catch(error => {
             console.log(error);
         });
  }

});

app.get('/', function (req, res) {
  getRealm()
      .then(realm =>{
        var posts = realm.objects('Post');
        res.render('index.ejs',{
          post:{
          id : uuid(),
          post_title:"title",
          post_content:"content"
          },
          posts :posts,
        });

       }).catch(error => {
           console.log(error);
       });
});

//
// app.get('/write', function(req, res) {
//   getRealm()
//       .then(realm =>{
//          var post = realm.objects('Post');
//
//              res.render('write.ejs', {
//                post:{
//                id : uuid(),
//                post_title:"title",
//                post_content:"content"
//                },
//                 posts: post,});
//
//
//       }).catch(error => {
//         console.log(error);
//       });
//
// });
// app.post('/go',function(req,res){
//   res.json(req.body.post);
// });
//
// app.post('/write',function(req,res){
// getRealm()
//     .then(realm =>{
//        var post = realm.objects('Post');
//         var p = realm.objects('Post').filtered('id = "'+req.body.id+'"');
//         res.render('write.ejs', {post:{
//           id:p[0].id,
//           post_title:p[0].post_title,
//           post_content:p[0].post_content
//         },
//         posts: post,});
//
//     }).catch(error => {
//       console.log(error);
//     });
//
//
// });
//
//
//
// app.post('/write_save', function(req, res) {
//
//     getRealm()
//       .then(realm =>{
//          var post = realm.objects('Post');
//           var p = realm.objects('Post').filtered('id = "'+req.body.id+'"');
//
//           realm.write(() => {
//             if(p.length > 0){
//               var oldP = p[0];
//               oldP.post_title = req.body.title;
//               oldP.post_content = req.body.content;
//             } else
//             realm.create("Post",{
//               id : req.body.id,
//               post_title: req.body.title,
//               post_author: "kf",
//               post_content: req.body.content,
//               post_date :new Date(),
//               post_status:""
//             });
//
//
//             res.render('write.ejs', {post:{
//               id:req.body.id,
//               post_title:req.body.title,
//               post_content:req.body.content
//             },
//             posts: post,});
//
//         });
//       }).catch(error =>{
//         console.log(error);
//       });
// });
//


function getRealm(){
  var user =  Realm.Sync.User.current;
  var serverUrl  = REALM_BASE_URL +"/"+user.identity+"/post";
  var config  = {
    sync:{
      user:user,
      url:serverUrl
    },
    schema:[Post]
  };
    return  Realm.open(config);

}
function login(){

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
