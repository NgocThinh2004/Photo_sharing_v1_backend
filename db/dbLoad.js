const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const models = require("../modelData/models.js");
const User = require("./userModel.js");
const Photo = require("./photoModel.js");
const SchemaInfo = require("./schemaInfo.js");

const versionString = "1.0";

async function dbLoad() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Successfully connected to MongoDB Atlas!");
  } catch (error) {
    console.error("Unable to connect to MongoDB Atlas:", error);
    return;
  }

  await User.deleteMany({});
  await Photo.deleteMany({});
  await SchemaInfo.deleteMany({});

  const userModels = models.userListModel();
  const mapFakeId2RealId = {};
  for (const user of userModels) {
    try {
      if (!user.first_name || !user.last_name) {
        console.error("Missing first_name or last_name for user:", user);
        continue;
      }
      const login_name = `${user.first_name.toLowerCase()}${Math.floor(Math.random() * 1000)}`;
      const hashedPassword = await bcrypt.hash("password123", 10);
      const userObj = new User({
        login_name,
        password: hashedPassword,
        first_name: user.first_name,
        last_name: user.last_name,
        location: user.location,
        description: user.description,
        occupation: user.occupation,
      });
      await userObj.save();
      mapFakeId2RealId[user._id] = userObj._id;
      user.objectID = userObj._id;
      console.log(
        "Adding user:",
        user.first_name + " " + user.last_name,
        "with ID",
        user.objectID,
        "and login_name",
        login_name
      );
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  const photoModels = [];
  const userIDs = Object.keys(mapFakeId2RealId);
  userIDs.forEach((id) => {
    photoModels.push(...models.photoOfUserModel(id));
  });

  for (const photo of photoModels) {
    try {
      const photoObj = new Photo({
        file_name: photo.file_name,
        date_time: photo.date_time,
        user_id: mapFakeId2RealId[photo.user_id],
        comments: [],
      });

      if (photo.comments) {
        for (const comment of photo.comments) {
          if (comment.user && mapFakeId2RealId[comment.user._id]) {
            photoObj.comments.push({
              comment: comment.comment,
              date_time: comment.date_time,
              user_id: mapFakeId2RealId[comment.user._id],
            });
            console.log(
              "Adding comment of length %d by user %s to photo %s",
              comment.comment.length,
              mapFakeId2RealId[comment.user._id],
              photo.file_name
            );
          }
        }
      }

      await photoObj.save();
      console.log("Adding photo:", photo.file_name, "of user ID", photoObj.user_id);
    } catch (error) {
      console.error("Error creating photo:", error);
    }
  }

  try {
    const schemaInfo = await SchemaInfo.create({
      version: versionString,
    });
    console.log("SchemaInfo object created with version", schemaInfo.version);
  } catch (error) {
    console.error("Error creating schemaInfo:", error);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB Atlas");
}

dbLoad();