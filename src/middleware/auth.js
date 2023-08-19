const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { isValidObjectId } = require('../validation/validation');

const authentication = async (req, res, next) => {
  try {
    const token = req.header('Authorization', 'Bearer Token') || req.header('authorization', 'Bearer Token');

    if (!token) {
      return res.status(400).send({ status: false, message: 'Missing authentication token in request' });
    }
    const T = token.split(' ');
    let decodedToken;
    try {
      decodedToken = jwt.verify(T[1], 'Hercules', { ignoreExpiration: true });
    } catch (error) {
      return res.status(401).send({ status: false, massage: 'token is invalid' });
    }
    const timeOut = decodedToken.exp;

    if (Date.now() > (timeOut.exp) * 1000) {
      return res.status(401).send({ status: false, message: 'Session Expired, please login again' });
    }

    req.userId = decodedToken.userId;

    next();
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

const authorization = async (req, res, next) => {
  try {
    const tokenUserId = req.userId;
    const userId = req.params.userId.toString().trim();

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: 'Invalid User Id' });
    }
    const userExist = await userModel.findOne({ _id: userId });
    if (!userExist) {
      return res.status(404).send({ status: false, message: 'User Id does not exist' });
    }

    if (tokenUserId.toString() !== userId) {
      return res.status(403).send({ status: false, message: 'unauthorized access' });
    }
    next();
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};
module.exports = { authentication, authorization };
