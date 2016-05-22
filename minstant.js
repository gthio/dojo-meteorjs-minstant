Chats = new Mongo.Collection("chats");

if (Meteor.isClient) {

  Meteor.subscribe("users");  
  Meteor.subscribe("chats");

  // set up the main template the the router will use to build pages
  Router.configure({
  layoutTemplate: 'ApplicationLayout'
  });

  // specify the top level route, the page users see when they arrive at the site
  Router.route('/', function () {
    console.log("rendering root /");
    this.render("navbar", {to:"header"});
    this.render("lobby_page", {to:"main"});  
  });

  // specify a route that allows the current user to chat to another users
  Router.route('/chat/:_id', function () {
    
    // the user they want to chat to has id equal to 
    // the id sent in after /chat/... 
    var otherUserId = this.params._id;
    
    // find a chat that has two users that match current user id
    // and the requested user id
    var filter = {$or:[
      {user1Id:Meteor.userId(), user2Id:otherUserId}, 
      {user2Id:Meteor.userId(), user1Id:otherUserId}
    ]};
    
    console.log(filter);
    
    var chat = Chats.findOne(filter);
    if (!chat){// no chat matching the filter - need to insert a new one
      
      console.log('No chat');
      
      var user1Id = Meteor.userId();
      var user2Id = otherUserId;
      
      chatId = Meteor.call("createChat", user1Id, user2Id);
    }
    else {// there is a chat going already - use that. 
      
      console.log('have chat');
      
      chatId = chat._id;
    }
      
    if (chatId){// looking good, save the id to the session
      Session.set("chatId",chatId);
    }
      
    this.render("navbar", {to:"header"});
    this.render("chat_page", {to:"main"});  
  });

  ///
  // helper functions 
  ///   
  Template.available_user_list.helpers({
    users:function(){
      return Meteor.users.find();
    }
  })
    
  Template.available_user.helpers({
    getUsername:function(userId){
      user = Meteor.users.findOne({_id:userId});
      return user.profile.username;
    },
    
    isMyUser:function(userId){
      if (userId == Meteor.userId()){
        return true;
      }
      else {
        return false;
      }
    }
  })

  Template.chat_page.helpers({
    messages:function(){
      var chat = Chats.findOne({_id:Session.get("chatId")});
      return chat.messages;
    },
    
    other_user:function(){
      return ""
    }, 
  })
  
  Template.chat_message.helpers({
    getUserProfile: function(userId){
      var user = Meteor.users
        .findOne({_id: userId});
        
      return user.profile;
    }  
  })

  Template.chat_page.events({

    'submit .js-send-chat':function(event){

      // stop the form from triggering a page reload
      event.preventDefault();
      
      var msg = event.target.chat.value;
      var chatId = Session.get("chatId");
       
      Meteor.call("updateChat", chatId, msg);
    }
  })
}

// start up script that creates some users for testing
// users have the username 'user1@test.com' .. 'user8@test.com'
// and the password test123
if (Meteor.isServer) {
  
  Meteor.publish("users", function(){
    return Meteor.users.find();
  });
  
  Meteor.publish("chats", function(){
    return Chats.find({$or:[
      {user1Id: this.userId},
      {user2Id: this.userId}
    ]});
  });
  
  Meteor.startup(function () {
    if (!Meteor.users.findOne()){
      for (var i=1; i<9; i++){
        var email = "user"+i+"@test.com";
        var username = "user"+i;
        var avatar = "ava"+i+".png"
        console.log("creating a user with password 'test123' and username/ email: "+email);
        Meteor.users.insert({profile:{username:username, avatar:avatar}, emails:[{address:email}],services:{ password:{"bcrypt" : "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"}}});
      }
    } 
  });
}

Meteor.methods({
  createChat: function(user1Id, user2Id){
    var chat = {
      user1Id: user1Id,
      user2Id: user2Id,
      messages: []
    }
    
    return Chats.insert(chat);
  },
  
  updateChat: function(chatId, text){
    var chat = Chats.findOne({_id: chatId});
    var msgs = chat.messages;
    
    if (!msgs){
      msgs = [];
    }
    
    var msg = {
      text: text,
      senderId: this.userId
    };
    
    msgs.push(msg);
    chat.messages = msgs;
    
    Chats.update(chat._id,
      chat);
  }
});