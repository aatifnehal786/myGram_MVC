import mongoose from "mongoose";
const Schema = mongoose.Schema;



// Main user schema (keeps your original fields + devices)
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  mobile: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid mobile number!`
    }
  },
  profilePic: { type: String,default:"" },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
  password: { type: String, required: true }, // keep hashed passwords
  lastSeen: { type: Date, default: Date.now },

},
{
  timestamps: true // adds createdAt and updatedAt for the user doc
});

const User = mongoose.model("users", userSchema);


export default User;
