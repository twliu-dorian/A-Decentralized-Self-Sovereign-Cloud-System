//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
var rememberUSER = "";
//
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
// Mongo URI
const mongoURI = 'mongodb://localhost:27017/demo2-DB';
var conn = mongoose.createConnection('mongodb://localhost:27017/demo22-DB');
var conn2 = mongoose.createConnection('mongodb://localhost:27017/chatlistDB');
var foundItems2 = "";
//const mongoURI = 'mongodb+srv://admin-Dorian:Dorianliu1324@cluster0.p0ost.mongodb.net/test?retryWrites=true&w=majority';
// Create mongo connection
//const conn = mongoose.createConnection(mongoURI, {useNewUrlParser: true});
// Init gfs
let gfs;

conn.once('open', () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});
// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });
app.use(passport.initialize());
app.use(passport.session());

//mongoose.connect("mongodb+srv://admin-Dorian:Dorianliu1324@cluster0.p0ost.mongodb.net/<dbname>?retryWrites=true&w=majority", {useNewUrlParser: true});
mongoose.connect("mongodb://localhost:27017/demo2-DB", { useNewUrlParser: true });
mongoose.set("useCreateIndex", true);

//1. setup: DB and its embedded relationship
const itemsSchema = {
  name: String
}
const itemsSchema2 = {
  name: String,
  sender: String,
  receiver: String
};

const Item = conn.model("Item", itemsSchema);
const Item2 = conn2.model("Item2", itemsSchema2);

const item1 = new Item({
  name: "Welcome to your Personal Note!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});


const defaultItems = [item1, item2, item3];
const noteSchema = {
  name: String,
  items: [itemsSchema]
}

const Notes = conn.model("Notes", noteSchema);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  items: [itemsSchema]
});
//end of 1.
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = conn.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/notes", function (req, res) {

  Item.find({}, function (err, foundItems) {

    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      res.redirect("/notes");
    } else {
      res.render("notes", { listTitle: "Today", newListItems: foundItems, saymyname: rememberUSER });
    }
  });
});


app.get('/index', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('index', { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('index', { files: files });
    }
  });
});
app.post('/upload', upload.single('file'), (req, res) => {
  // res.json({ file: req.file });
  res.redirect('/index');
});

// @route GET /files
// @desc  Display all files in JSON
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }

    // Files exist
    return res.json(files);
  });
});

// @route GET /files/:filename
// @desc  Display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // File exists
    return res.json(file);
  });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }

    // Check if image
    if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
      // Read output to browser
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});

// @route DELETE /files/:id
// @desc  Delete file
app.delete('/files/:id', (req, res) => {
  gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
    if (err) {
      return res.status(404).json({ err: err });
    }

    res.redirect('/index');
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {

  User.register({ username: req.body.username }, req.body.password, function (err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/notes");
      });
    }
  });

});

app.post("/login", function (req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        console.log("hello" + user.username);
        rememberUSER = user.username;
        res.redirect("/notes");
      });
    }
  });

});

app.post("/notes", function (req, res) {

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    item.save();
    res.redirect("/notes");
  }
  // else {
  //   List.findOne({name: listName}, function(err, foundList){
  //     foundList.items.push(item);
  //     foundList.save();
  //     res.redirect("/notes" + listName);
  //   });
  // }
});

app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function (err) {
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/notes");
      }
    });
  } else {
    List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, function (err, foundList) {
      if (!err) {
        res.redirect("/notes" + listName);
      }
    });
  }


})
app.get("/receivebox", function (req, res) {
  console.log(rememberUSER);
  console.log(Item2.find());
  Item2.find({ receiver: rememberUSER }, function (err, foundItems2) {
    console.log(foundItems2);
    if (foundItems2.length === 0) {
      const item4 = new Item2({
        name: "No new message.",
        sender: "SYSTEM",
        receiver: rememberUSER
      });
      const defaultItems2 = [item4];
      Item2.insertMany(defaultItems2, function (err) {
        if (err) {
          console.log("err here" + err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      res.redirect("/receivebox");
    } else {
      console.log("success in part1");
      res.render("receivebox", {
        newListItems2: foundItems2,
        saymyname: rememberUSER
      });
    }
  });
});
app.post("/receivebox", function (req, res) {
  const msgName = req.body.sendMSG;
  const receiveName = req.body.sendTO;


  console.log(req.body);
  var sendername = rememberUSER;

  const item2 = new Item2({
    name: msgName,
    sender: sendername,
    receiver: receiveName
  });

  item2.save();
  console.log("Successfully savevd");
  res.redirect("/receivebox");

});
app.post("/delete2", function (req, res) {
  console.log(req.body);
  const checkedItemId = req.body.checkbox;


  Item2.findByIdAndRemove(checkedItemId, function (err) {
    if (!err) {
      console.log("Successfully deleted checked item.");
      res.redirect("/receivebox");
    }
  });


});

app.get("/faces", function (req, res) {
  app.engine('html', require('ejs').renderFile);
  res.render("face.html");
});

app.get("/rekognition", function (req, res) {
  app.engine('html', require('ejs').renderFile);
  res.render("rekognition.html");
});

app.listen(3001, function () {
  console.log("Server started on port 3001.");
});
