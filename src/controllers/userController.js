const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { uploadFile } = require('./helper/awsUpload');
const {
  isValid, isValidRequestBody, isValidObjectId,
  isValidEmail, isValidPhone, isValidPincode, validString,
} = require('../validation/validation');

//= ======================== User Creation() POST /register=================================//

const createUser = async function (req, res) {
  try {
    const { data } = req.body;
    const data1 = JSON.parse(data);
    const { files } = req;

    const {
      fname, lname, phone, email, password, address,
    } = data1;

    if (!isValidRequestBody(data1)) {
      return res.status(400).send({ status: false, message: 'Input Data for Creating User' });
    }

    if (!files || typeof files === 'string' || files == '') {
      return res.status(400).send({ status: false, message: 'Profile image is required...' });
    }

    if (!isValid(fname)) {
      return res.status(400).send({ status: false, message: 'fname is required...' });
    }

    if (!isValid(lname)) {
      return res.status(400).send({ status: false, message: 'lname is required...' });
    }

    if (!(phone)) {
      return res.status(400).send({ status: false, message: 'Phone No. is required' });
    }

    if (!isValid(email)) {
      return res.status(400).send({ status: false, message: 'Email is required' });
    }

    if (!isValid(password)) {
      return res.status(400).send({ status: false, message: 'Password is required' });
    }
    if (!address || typeof address !== 'object') {
      return res.status(400).send({ status: false, message: 'Object of address is required' });
    }

    if (!address.shipping || typeof address.shipping !== 'object') {
      return res.status(400).send({ status: false, message: 'Object shipping address is required...' });
    }
    if (!address.billing || typeof address.billing !== 'object') {
      return res.status(400).send({ status: false, message: 'Object billing address is required...' });
    }

    if (!isValid(address.shipping.street)) {
      return res.status(400).send({ status: false, message: 'Street of shipping address is required...' });
    }

    if (!isValid(address.shipping.city)) {
      return res.status(400).send({ status: false, message: 'City of shipping address is required...' });
    }

    if (!isValidPincode(address.shipping.pincode)) {
      return res.status(400).send({ status: false, message: 'Shipping address pincode must be 6 digit number' });
    }

    if (!isValid(address.billing.street)) {
      return res.status(400).send({ status: false, message: 'Street of billing address is required...' });
    }

    if (!isValid(address.billing.city)) {
      return res.status(400).send({ status: false, message: 'City of billing address is required...' });
    }

    if (!isValidPincode(address.billing.pincode)) {
      return res.status(400).send({ status: false, message: 'Billing address pincode must be 6 digit number' });
    }

    if (phone == '') return res.status(400).send({ status: false, message: 'Phone Number cannot be empty' });

    if (!isValidPhone(phone)) {
      return res.status(400).send({ status: false, message: 'please enter a valid Phone no' });
    }

    const isRegisteredphone = await userModel.findOne({ phone }).lean();

    if (isRegisteredphone) {
      return res.status(400).send({ status: false, message: 'phoneNo number already registered' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).send({ status: false, message: 'Please enter a valid Email' });
    }

    const isRegisteredEmail = await userModel.findOne({ email }).lean();
    if (isRegisteredEmail) {
      return res.status(400).send({ status: false, message: 'email id already registered' });
    }

    if (password == '' || password.toString().trim().length < 8) {
      return res.status(400).send({ status: false, message: 'Your password must be at least 8 characters' });
    }

    if (password.toString().trim().length > 15) {
      return res.status(400).send({ status: false, message: 'Password cannot be more than 15 characters' });
    }

    const bcryptPassword = await bcrypt.hash(password, 6);
    data1.password = bcryptPassword;

    const uploadedFileURL = await uploadFile(files[0]);

    data1.profileImage = uploadedFileURL;

    const userCreated = await userModel.create(data1);

    res.status(201).send({ status: true, message: 'Success', data: userCreated });
  } catch (err) {
    console.log(err);
    res.status(500).send({ status: false, error: err.message });
  }
};

//= ==================================login User(POST /login) ==================================//
const loginUser = async (req, res) => {
  try {
    const requestBody = req.body;

    const { email, password } = requestBody;

    if (!isValidRequestBody(requestBody)) {
      return res.status(400).send({ status: false, msg: 'Please enter login credentials' });
    }

    if (!isValid(email)) {
      res.status(400).send({ status: false, msg: 'Enter an email' });
      return;
    }

    if (!isValidEmail(email)) {
      return res.status(400).send({ status: false, message: 'Email should be a valid email address' });
    }

    if (!isValid(password)) {
      res.status(400).send({ status: false, msg: 'enter a password' });
      return;
    }

    if (!(password.length >= 8 && password.length <= 15)) {
      return res.status(400).send({ status: false, message: 'Password should be  min 8 and max 15 charactors ' });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).send({ status: false, message: 'Invalid login credentials, email id doesn\'t exist' });
    }

    const hashedPassword = user.password;

    const checkPassword = await bcrypt.compare(password, hashedPassword);

    if (!checkPassword) return res.status(401).send({ status: false, message: 'Invalid login credentials , Invalid password' });

    const token = jwt.sign({
      userId: user._id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 48 * 60 * 60,
    }, 'Hercules');

    res.status(200).send({ status: true, messsge: 'User Login Successful', data: { userId: user._id, token } });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: false, error: error.message });
  }
};

//= ==================get details by User id (GET /user/:userId/profile)========================//
const getById = async (req, res) => {
  try {
    const UserIdData = req.params.userId;

    if (!isValidObjectId(UserIdData)) return res.status(400).send({ status: false, message: 'userId is not valid' });

    const user = await userModel.findById(UserIdData);

    if (!user) return res.status(400).send({ status: false, messgage: ' user does not exists' });

    return res.status(200).send({ status: true, message: 'User profile details', data: user });
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};

//= ======================update User(PUT /user/:userId/profile) =============================//

const updateUser = async (req, res) => {
  try {
    const requestBody = req.body;
    const {
      fname, lname, phone, email, password, address,
    } = requestBody;
    const { userId } = req.params;
    const { files } = req;

    if ((!files) && Object.keys(requestBody).length == 0) {
      return res.status(400).send({ status: false, message: 'Input field cannot be empty' });
    }

    if (fname == '') {
      return res.status(400).send({ status: false, message: 'fname cannot be empty' });
    }

    if (fname && !validString(fname)) {
      return res.status(400).send({ status: false, message: 'fname is Required' });
    }

    if (lname == '') {
      return res.status(400).send({ status: false, message: 'lname cannot be empty' });
    }
    if (lname && !validString(lname)) {
      return res.status(400).send({ status: false, message: 'lname is Required' });
    }

    if (email == '') {
      return res.status(400).send({ status: false, message: 'email cannot be empty' });
    }
    if (email) {
      if (!isValid(email)) {
        return res.status(400).send({ status: false, message: 'Invalid request parameter, please provide email' });
      }
      if (!isValidEmail(email)) {
        return res.status(400).send({ status: false, message: 'Email should be a valid email address' });
      }
      const isEmailAlredyPresent = await userModel.findOne({ email });
      if (isEmailAlredyPresent) {
        return res.status(400).send({ status: false, message: `Unable to update email. ${email} is already registered.` });
      }
    }

    if (phone == '') return res.status(400).send({ status: false, message: 'phone Number cannot be empty' });
    if (phone) {
      if (!isValid(phone)) {
        return res.status(400).send({ status: false, message: 'Invalid request parameter, please provide Phone number.' });
      }
      if (!isValidPhone(phone)) {
        return res.status(400).send({ status: false, message: 'Please enter a valid phone number' });
      }
      const isPhoneAlredyPresent = await userModel.findOne({ phone });
      if (isPhoneAlredyPresent) {
        return res.status(400).send({ status: false, message: `Unable to update phone. ${phone} is already registered.` });
      }
    }

    if (password == '') return res.status(400).send({ status: false, message: 'password must be present' });
    const tempPassword = password;
    let encryptedPassword;
    if (tempPassword) {
      if (!isValid(tempPassword)) {
        return res.status(400).send({ status: false, message: 'Invalid request parameter, please provide password' });
      }

      encryptedPassword = await bcrypt.hash(tempPassword, 6);
    }

    let shippingStreet;
    let shippingCity;
    let shippingPincode;
    if (address) {
      // console.log(address)
      const shippingAddressToString = JSON.stringify(address); // convert object into string
      // convert string in to object
      const parsedShippingAddress = JSON.parse(shippingAddressToString);
      // console.log(parsedShippingAddress)
      if (isValidRequestBody(parsedShippingAddress)) {
        if (parsedShippingAddress.hasOwnProperty('shipping')) {
          if (parsedShippingAddress.shipping.hasOwnProperty('street')) {
            if (!isValid(parsedShippingAddress.shipping.street)) {
              return res.status(400).send({ status: false, message: "Please provide shipping address's Street" });
            }
          }
          if (parsedShippingAddress.shipping.hasOwnProperty('city')) {
            if (!isValid(parsedShippingAddress.shipping.city)) {
              return res.status(400).send({ status: false, message: "Please provide shipping address's City" });
            }
          }
          if (parsedShippingAddress.shipping.hasOwnProperty('pincode')) {
            if (!isValidPincode(parsedShippingAddress.shipping.pincode)) {
              return res.status(400).send({ status: false, message: "Please provide proper shipping address's pincode" });
            }
          }
          shippingStreet = address.shipping.street;
          shippingCity = address.shipping.city;
          shippingPincode = address.shipping.pincode;
        }
      } else {
        return res.status(400).send({ status: false, message: 'Shipping address cannot be empty' });
      }
    }

    let billingStreet;
    let billingCity;
    let billingPincode;
    if (address) {
      const billingAddressToString = JSON.stringify(address);

      const parsedBillingAddress = JSON.parse(billingAddressToString);

      if (isValidRequestBody(parsedBillingAddress)) {
        if (parsedBillingAddress.hasOwnProperty('billing')) {
          if (parsedBillingAddress.billing.hasOwnProperty('street')) {
            if (!isValid(parsedBillingAddress.billing.street)) {
              return res.status(400).send({ status: false, message: "Please provide billing address's Street" });
            }
          }
          if (parsedBillingAddress.billing.hasOwnProperty('city')) {
            if (!isValid(parsedBillingAddress.billing.city)) {
              return res.status(400).send({ status: false, message: "Please provide billing address's City" });
            }
          }
          if (parsedBillingAddress.billing.hasOwnProperty('pincode')) {
            if (!isValidPincode(parsedBillingAddress.billing.pincode)) {
              return res.status(400).send({ status: false, message: "Please provide proper billing address's pincode" });
            }
          }
          billingStreet = address.billing.street;
          billingCity = address.billing.city;
          billingPincode = address.billing.pincode;
        }
      } else {
        return res.status(400).send({ status: false, message: ' Invalid request parameters. Billing address cannot be empty' });
      }
    }
    let updatedProfileImage;
    if (files && files.length > 0) {
      updatedProfileImage = await uploadFile(files[0]);
    }
    const changeProfileDetails = await userModel.findOneAndUpdate({ _id: userId }, {
      $set: {
        fname,
        lname,
        email,
        profileImage: updatedProfileImage,
        phone,
        password: encryptedPassword,
        'address.shipping.street': shippingStreet,
        'address.shipping.city': shippingCity,
        'address.shipping.pincode': shippingPincode,
        'address.billing.street': billingStreet,
        'address.billing.city': billingCity,
        'address.billing.pincode': billingPincode,
      },
    }, { new: true });
    return res.status(200).send({ status: true, message: ' User Profile Updated', data: changeProfileDetails });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = {
  createUser, loginUser, getById, updateUser,
};
