
var albumBucketName = "api-bridge-rekognition";
var bucketRegion = "us-east-1";
var IdentityPoolId = 'us-east-1:647f0715-57a0-4b90-a4c0-2edeb4aaeed1';



AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: "2006-03-01",
  params: { Bucket: albumBucketName }
});

function listAlbums() {
  s3.listObjects({ Delimiter: "/" }, function(err, data) {
    if (err) {
      return alert("There was an error listing your albums: " + err.message);
    } else {
      var albums = data.CommonPrefixes.map(function(commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace("/", ""));
        return getHtml([
          "<li>",
          "<span onclick=\"deleteAlbum('" + albumName + "')\">X</span>",
          "<span onclick=\"viewAlbum('" + albumName + "')\">",
          albumName,
          "</span>",
          "</li>"
        ]);
      });
      var message = albums.length
        ? getHtml([
            "<p>Click on an album name to view it.</p>",
            "<p>Click on the X to delete the album.</p>"
          ])
        : "<p>You do not have any albums. Please Create album.";
      var htmlTemplate = [
        "<h2>Albums</h2>",
        message,
        "<ul>",
        getHtml(albums),
        "</ul>",
        "<button onclick=\"createAlbum(prompt('Enter Album Name:'))\">",
        "Create New Album",
        "</button>"
      ];
      document.getElementById("app").innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
  albumName = albumName.trim();
  if (!albumName) {
    return alert("Album names must contain at least one non-space character.");
  }
  if (albumName.indexOf("/") !== -1) {
    return alert("Album names cannot contain slashes.");
  }
  var albumKey = encodeURIComponent(albumName);
  s3.headObject({ Key: albumKey }, function(err, data) {
    if (!err) {
      return alert("Album already exists.");
    }
    if (err.code !== "NotFound") {
      return alert("There was an error creating your album: " + err.message);
    }
    s3.putObject({ Key: albumKey }, function(err, data) {
      if (err) {
        return alert("There was an error creating your album: " + err.message);
      }
      alert("Successfully created album.");
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
  var albumPhotosKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
    if (err) {
      return alert("There was an error viewing your album: " + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + "/";

    var photos = data.Contents.map(function(photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        "<span>",
        "<div>",
        '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
        "</div>",
        "<div>",
        "<span onclick=\"deletePhoto('" +
          albumName +
          "','" +
          photoKey +
          "')\">",
        "X",
        "</span>",
        "<span>",
        photoKey.replace(albumPhotosKey, ""),
        "</span>",
        "</div>",
        "</span>"
      ]);
    });
    var message = photos.length
      ? "<p>Click on the X to delete the photo</p>"
      : "<p>You do not have any photos in this album. Please add photos.</p>";
    var htmlTemplate = [
      "<h2>",
      "Album: " + albumName,
      "</h2>",
      message,
      "<div>",
      getHtml(photos),
      "</div>",
      '<input id="photoupload" type="file" accept="image/*">',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
      "Add Photo",
      "</button>",
      '<button onclick="listAlbums()">',
      "Back To Albums",
      "</button>"
    ];
    document.getElementById("app").innerHTML = getHtml(htmlTemplate);
  });
}

function addPhoto(albumName) {
  var files = document.getElementById("photoupload").files;
  var wen = document.getElementById("photoupload");
  console.log("1"+files);
  console.log("2"+wen);
  if (!files.length) {
    return alert("Please choose a file to upload first.");
  }
  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(albumName) + "/";

  var photoKey = albumPhotosKey + fileName;

  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file,
      ACL: "public-read"
    }
  });

  var promise = upload.promise();

  promise.then(
    function(data) {
      alert("Successfully uploaded photo.");
      viewAlbum(albumName);
    },
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
}

function addPhoto_reg() {
  var file ="";
  var img = document.getElementById("imageprev");
  fetch(img.src)
.then(res => res.blob())
.then(blob => {
  file = new File([blob], 'register_rekog.jpeg', blob)
  console.log(file);
}).then(function() {
  // fulfillment
  //if (!files.length) {
  //  return alert("Please choose a file to upload first.");
  //}
  //var file = files[0];
  var fileName = "register_rekog.jpeg";
  var albumPhotosKey = encodeURIComponent('Register') + "/";
console.log(albumPhotosKey);
  var photoKey = albumPhotosKey + fileName;
console.log(photoKey);
  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file,
      ACL: "public-read"
    }
  });

  var promise = upload.promise();

  promise.then(
    function(data) {
      alert("Successfully uploaded photo.");
      viewAlbum('Register');
    },
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
});



}

function addPhoto_log() {
  var file ="";
  var img = document.getElementById("imageprev");
  fetch(img.src)
.then(res => res.blob())
.then(blob => {
  file = new File([blob], 'login_rekog.jpeg', blob)
  console.log(file);
}).then(function() {
  // fulfillment
  //if (!files.length) {
  //  return alert("Please choose a file to upload first.");
  //}
  //var file = files[0];
  var fileName = "login_rekog.jpeg";
  var albumPhotosKey = encodeURIComponent('Login') + "/";
console.log(albumPhotosKey);
  var photoKey = albumPhotosKey + fileName;
console.log(photoKey);
  // Use S3 ManagedUpload class as it supports multipart uploads
  var upload = new AWS.S3.ManagedUpload({
    params: {
      Bucket: albumBucketName,
      Key: photoKey,
      Body: file,
      ACL: "public-read"
    }
  });

  var promise = upload.promise();

  promise.then(
    function(data) {
      alert("Successfully uploaded photo.");
      viewAlbum('Login');
    },
    function(err) {
      return alert("There was an error uploading your photo: ", err.message);
    }
  );
}).then(function() {
// fulfillment
AnonLog();
CompareFaces();



});

function deletePhoto(albumName, photoKey) {
  s3.deleteObject({ Key: photoKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your photo: ", err.message);
    }
    alert("Successfully deleted photo.");
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
  var albumKey = encodeURIComponent(albumName) + "/";
  s3.listObjects({ Prefix: albumKey }, function(err, data) {
    if (err) {
      return alert("There was an error deleting your album: ", err.message);
    }
    var objects = data.Contents.map(function(object) {
      return { Key: object.Key };
    });
    s3.deleteObjects(
      {
        Delete: { Objects: objects, Quiet: true }
      },
      function(err, data) {
        if (err) {
          return alert("There was an error deleting your album: ", err.message);
        }
        alert("Successfully deleted album.");
        listAlbums();
      }
    );
  });
}






function AnonLog() {

  // Configure the credentials provider to use your identity pool
  AWS.config.region = 'us-east-1'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:647f0715-57a0-4b90-a4c0-2edeb4aaeed1',
  });
  // Make the call to obtain credentials
  AWS.config.credentials.get(function () {
    // Credentials will be available when this function is called.
    var accessKeyId = AWS.config.credentials.accessKeyId;
    var secretAccessKey = AWS.config.credentials.secretAccessKey;
    var sessionToken = AWS.config.credentials.sessionToken;
  });
}

function CompareFaces() {
  AWS.region = "RegionToUse";
  var rekognition = new AWS.Rekognition();
  var params = {
      SimilarityThreshold: 90,
      SourceImage: {
          S3Object: {
              Bucket: "api-bridge-rekognition",
              Name: "Register/wen1.jpg"
          }
      },
      TargetImage: {
          S3Object: {
              Bucket: "api-bridge-rekognition",
              Name: "Login/login_rekog.jpeg"
              //Name: "Login/Gini.jpg"
          }
      }
  };

  rekognition.compareFaces(params, function (err, data) {

      if (err) console.log(err, err.stack); // an error occurred
      else console.log(data);
      console.log(data["FaceMatches"]);

      
      var Similarity_flag=data["FaceMatches"][0]["Similarity"] > '90';
      console.log(Similarity_flag);
      if (Similarity_flag == true)
      {
        document.getElementById("opResult2").innerHTML = "Face matched!";
        console.log("Face matched!");
      }
      else {
        document.getElementById("opResult2").innerHTML = "Face unmatched!";
        console.log("Face unmatched!");
      }


      //console.log(data["UnmatchedFaces"][0]["Confidence"]);
      /*if(data["FaceMatches"][0] == null){
          if(data["UnmatchedFaces"][0]["Confidence"] > '90')console.log("Face unmatched!");
          else if(data["UnmatchedFaces"][0]["Confidence"] < '90')
          {
            match_flag=1;
          console.log("Face matched!");
          }
      }
      else if(data["UnmatchedFaces"][0] == null){
          if(data["FaceMatches"][0]["Similarity"] > '90'){
            match_flag=1;
          console.log("Face matched!");
          }
          else if(data["FaceMatches"][0]["Similarity"] < '90')console.log("Face unmatched!");
      }*/
  });

}}
