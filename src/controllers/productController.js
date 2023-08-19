const currencySymbol = require('currency-symbol-map');
const productModel = require('../models/productModel');
const {
  isValid,
  isValidRequestBody,
  isValidObjectId,
  isValidNumber,
  isValidScripts,
  validString,
  validInstallment,
} = require('../validation/validation');
const { uploadFile } = require('./helper/awsUpload');

//= =======================Create Product(POST /products)=======================================//

const createProduct = async (req, res) => {
  try {
    const requestBody = req.body;

    if (!isValidRequestBody(requestBody)) {
      return res.status(400).send({ status: false, message: 'Invalid params received in request body' });
    }
    if (requestBody.isDeleted && requestBody.isDeleted != 'false') {
      return res.status(400).send({ status: false, message: 'Product cannot be deleted while updation' });
    }

    const {
      title, description, price, currencyId, currencyFormat, isFreeShipping,
      style, availableSizes, installments,
    } = requestBody;

    if (!title || title == '') {
      return res.status(400).send({ status: false, message: 'Title  cannot be empty' });
    }
    if (title) {
      if (!validString(title) || !isValidScripts(title)) { return res.status(400).send({ status: false, message: 'Title is invalid (Should Contain Alphabets, numbers.' }); }
      const isTitleAlreadyUsed = await productModel.findOne({ title });

      if (isTitleAlreadyUsed) {
        return res.status(400).send({ status: false, message: 'Title is already used.' });
      }
    }

    if (!description || description == '') {
      return res.status(400).send({ status: false, message: 'Description  cannot be empty' });
    }

    if (!validString(description) || !isValidScripts(description)) {
      return res.status(400).send({ status: false, message: 'description is not in valid format' });
    }

    if (!(price)) {
      return res.status(400).send({ status: false, message: 'Price is required' });
    }

    if (!isValidNumber(price)) {
      return res.status(400).send({ status: false, message: 'Price should be a valid number' });
    }
    if (price <= 0) {
      return res.status(400).send({ status: false, message: 'Price cannot be Zero' });
    }

    if (!validString(currencyId)) {
      return res.status(400).send({ status: false, message: 'CurrencyId is required' });
    }

    if (currencyId != 'INR') {
      return res.status(400).send({ status: false, message: 'currencyId should be INR' });
    }

    if (currencyFormat && currencyFormat != '₹') {
      return res.status(400).send({ status: false, message: 'currencyformat should be ₹' });
    }

    if (installments) {
      if (!validInstallment(installments)) {
        return res.status(400).send({ status: false, message: "installments can't be a decimal number & must be greater than equalto zero " });
      }
    }

    const productImage = req.files;
    if (!(productImage && productImage.length > 0)) {
      return res.status(400).send({ status: false, msg: 'product image is required' });
    }

    const productImageUrl = await uploadFile(productImage[0]);

    const newProductData = {

      title,
      description,
      price,
      currencyId,
      currencyFormat: currencySymbol(currencyId),
      availableSizes,
      isFreeShipping,
      style,
      installments,
      productImage: productImageUrl,
    };

    if (availableSizes) {
      const array = availableSizes.split(',').map((x) => x.trim().toUpperCase());

      for (let i = 0; i < array.length; i++) {
        if (!(['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'].includes(array[i]))) {
          return res.status(400).send({ status: false, message: `Available Sizes must be among ${['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL']}` });
        }
      }
      newProductData.availableSizes = array;
    }

    const saveProductDetails = await productModel.create(newProductData);
    res.status(201).send({ status: true, message: 'Success', data: saveProductDetails });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: false, error: error.message });
  }
};

//= ========================= get Product by Filter(GET /products) =============================//

const getProduct = async function (req, res) {
  try {
    let {
      size, name, priceGreaterThan, priceLessThan, priceSort,
    } = req.query;
    const data = req.query;

    if (data.isDeleted && data.isDeleted != 'false') {
      return res.status(400).send({ status: false, message: 'isDeleted must be false' });
    }

    const value = [size, name, priceGreaterThan, priceLessThan, priceSort];
    const valueString = ['size', 'name', 'priceGreaterThan', 'priceLessThan', 'priceSort'];

    for (let i = 0; i < value.length; i++) {
      const key = `${value[i]}`;
      if (key == '') {
        return res.status(400).send({ status: false, message: `${valueString[i]} can not be empty` });
      }
    }

    const filter = {};

    const isValidSize = (Arr) => {
      const newArr = [];
      if (Arr.length === 0) { return false; }
      const brr = Arr[0].split(',');
      for (let i = 0; i < brr.length; i++) {
        if (!['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'].includes(brr[i].toUpperCase())) { return false; }
        newArr.push(brr[i].toUpperCase());
      }
      return newArr;
    };

    if (size) {
      size = [size].flat(); // convert size into array of string with length 1

      if (size && !isValidSize(size)) {
        return res.status(400).send({ status: false, message: 'Size Must be of these values ---> S, XS, M, X, L, XXL, XL' });
      }

      size = isValidSize(size);
      filter.availableSizes = { $in: size };
    }

    if (name) {
      name = name.toString().trim();

      if (!isValid(name)) {
        return res.status(400).send({ status: false, message: 'name must be a valid string' });
      }
      if (name.length < 2) return res.status(400).send({ status: false, message: 'name must be at least 2 letters' });
      filter.title = { $regex: name, $options: 'i' };
    }

    if (priceGreaterThan) {
      priceGreaterThan = priceGreaterThan.toString().trim();

      if (!isValidNumber(priceGreaterThan)) {
        return res.status(400).send({ status: false, message: 'priceGreaterThan must have valid Numbers' });
      }
      filter.price = { $gt: priceGreaterThan };
    }

    if (priceLessThan) {
      priceLessThan = priceLessThan.toString().trim();

      if (!isValidNumber(priceLessThan)) {
        return res.status(400).send({ status: false, message: 'priceLessThan must have valid Numbers' });
      }
      filter.price = { $lt: priceLessThan };
    }

    if (priceGreaterThan && priceLessThan) {
      if (priceGreaterThan == priceLessThan) {
        return res.status(400).send({ status: false, message: 'priceGreaterThan and priceLessThan can not be the equal ' });
      }
      if (Number(priceGreaterThan) > Number(priceLessThan)) {
        return res.status(400).send({ status: false, message: 'priceGreaterThan can not be more than priceLessThan' });
      }

      filter.price = { $gt: priceGreaterThan, $lt: priceLessThan };
    }

    filter.isDeleted = false;

    if (priceSort) {
      priceSort = priceSort.toString().trim();
      if (!(priceSort == '-1' || priceSort == '1')) {
        return res.status(400).send({ status: false, message: 'value of priceSort must be 1 or -1 ' });
      }
    } else {
      priceSort = 1;
    }
    const getData = await productModel.find(filter).sort({ price: priceSort }).select({ __v: 0 });

    if (getData.length == 0) {
      return res.status(404).send({ status: false, message: 'Product not found' });
    }
    return res.status(200).send({ status: true, message: 'Success', data: getData });
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};
//= ===================== getProductById(GET /products/:productId)===============================//

const getProductById = async (req, res) => {
  try {
    const productId = req.params.productId?.toString().trim();

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: 'Invalid Product Id' });
    }

    const findProducts = await productModel.findOne({ _id: productId, isDeleted: false }).lean();

    if (!findProducts) {
      return res.status(404).send({ status: false, message: 'Product not found' });
    }

    return res.status(200).send({ status: true, message: 'Success', data: findProducts });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

//= ===================== update Product(PUT /products/:productId) ==============================//

const updateProduct = async function (req, res) {
  try {
    const requestBody = req.body;
    const { files } = req;
    const { productId } = req.params;

    const {
      title, description, price, currencyId, isFreeShipping, style, availableSizes, installments,
    } = requestBody;

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: `${productId} is not a valid product id` });
    }

    if ((!files) && Object.keys(requestBody).length == 0) {
      return res.status(400).send({ status: false, message: 'Input field cannot be empty' });
    }

    if (requestBody.isDeleted && requestBody.isDeleted != 'false') {
      return res.status(400).send({ status: false, data: 'isDeleted must be false' });
    }
    const updatedProductDetails = {};

    const product = await productModel.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return res.status(404).send({ status: false, message: 'product not found' });
    }

    if (title == '') { return res.status(400).send({ status: false, message: 'Title  cannot be empty' }); }
    if (title) {
      if (!isValid(title) || !isValidScripts(title)) { return res.status(400).send({ status: false, message: 'Title is in invalid format' }); }
      const isTitleAlreadyUsed = await productModel.findOne({ title });

      if (isTitleAlreadyUsed) {
        return res.status(400).send({ status: false, message: 'Title is already used.' });
      }
      if (!updatedProductDetails.hasOwnProperty('title')) { updatedProductDetails.title = title; }
    }

    if (description == '') {
      return res.status(400).send({ status: false, message: 'Description  cannot be empty' });
    }
    if (description) {
      if (!isValid(description) || !isValidScripts(description)) {
        return res.status(400).send({ status: false, message: 'Description is in invalid format' });
      }
      if (!updatedProductDetails.hasOwnProperty('description')) {
        updatedProductDetails.description = description;
      }
    }

    if (price == '') return res.status(400).send({ status: false, message: 'Price field cannot be empty' });
    if (price) {
      if (!isValid(price) || !isValidNumber(price)) {
        return res.status(400).send({ status: false, message: 'Price should be a valid number' });
      }

      if (price <= 0) {
        return res.status(400).send({ status: false, message: 'Price should be a valid number' });
      }

      if (!updatedProductDetails.hasOwnProperty('price')) { updatedProductDetails.price = price; }
    }

    if (currencyId == '') return res.status(400).send({ status: false, message: 'currencyId field cannot be empty' });
    if (currencyId) {
      if (!(currencyId == 'INR')) {
        return res.status(400).send({ status: false, message: 'currencyId should be a INR' });
      }

      if (!updatedProductDetails.hasOwnProperty('currencyId')) { updatedProductDetails.currencyId = currencyId; }
    }

    if (isFreeShipping == '') return res.status(400).send({ status: false, message: 'isFreeShipping field cannot be empty' });

    if (isFreeShipping) {
      if (!((isFreeShipping === 'true') || (isFreeShipping === 'false'))) {
        return res.status(400).send({ status: false, message: 'isFreeShipping should be a boolean value' });
      }

      if (!updatedProductDetails.hasOwnProperty('isFreeShipping')) { updatedProductDetails.isFreeShipping = isFreeShipping; }
    }

    if (style == '') {
      return res.status(400).send({ status: false, message: 'style cannot be empty' });
    }
    if (style) {
      if (!isValid(style) || !isValidScripts(style)) { return res.status(400).send({ status: false, message: 'style is in invalid format' }); }

      if (!updatedProductDetails.hasOwnProperty('style')) { updatedProductDetails.style = style; }
    }

    if (availableSizes) {
      const sizesArray = availableSizes.split(',').map((x) => x.trim().toUpperCase());

      for (let i = 0; i < sizesArray.length; i++) {
        if (!(['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'].includes(sizesArray[i]))) {
          return res.status(400).send({ status: false, message: `availableSizes should be among ${['S', 'XS', 'M', 'X', 'L', 'XXL', 'XL']}` });
        }
      }

      updatedProductDetails.$set = {};
      // {$set : {availableSizes : sizesArray}}
      updatedProductDetails.$set.availableSizes = sizesArray;
    }

    if (installments == '') {
      return res.status(400).send({ status: false, message: 'installments cannot be empty' });
    }

    if (installments) {
      if (!validInstallment(installments)) {
        return res.status(400).send({ status: false, message: "installments should be in numbers & can't be a decimal number & must be greater than or equal to zero " });
      }
      if (!updatedProductDetails.hasOwnProperty('installments')) { updatedProductDetails.installments = installments; }
    }
    if (files) {
      if ((files && files.length > 0)) {
        const updatedproductImage = await uploadFile(files[0]);

        if (!updatedProductDetails.hasOwnProperty('productImage')) {
          updatedProductDetails.productImage = updatedproductImage;
        }
      }
    }
    const updatedProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      updatedProductDetails,
      { new: true },
    );

    return res.status(200).send({ status: true, message: 'Successfully updated product details.', data: updatedProduct });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

//= ======================deleteProductById  (DELETE /products/:productId)=======================//

const deleteProductById = async (req, res) => {
  try {
    const productId = req.params.productId?.toString().trim();

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: 'Invalid Product Id' });
    }

    const checkProduct = await productModel.findOne({ _id: productId, isDeleted: false });

    if (!checkProduct) {
      return res.status(404).send({ status: false, message: "Product doesn't exist" });
    }

    const deletedProduct = await productModel.findOneAndUpdate(
      { _id: productId },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true },
    );

    return res.status(200).send({ status: true, message: 'Product Deleted Succesfully', data: deletedProduct });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  createProduct, updateProduct, getProduct, getProductById, deleteProductById,
};
