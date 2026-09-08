import mongoose ,{Schema} from "mongoose";

const UserSchema=new Schema({
    name:{type:String,required:"true"},
     username:{type:String,required:"true",unique:"ture"},
      password:{type:String,required:"true"},
      token:{type:String}
})

const User =mongoose.model("User",UserSchema);
export {User};  