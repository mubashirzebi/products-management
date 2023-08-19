const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');
const { isValidRequestBody, isValidObjectId } = require('../validation/validation');

//= =================Create Cart (POST /users/:userId/cart)===========================//

const createCart = async (req, res) => {
  try {
    const data = req.body;

    let { userId } = req.params;

    userId = userId?.toString().trim();

    let { productId, cartId } = data;

    productId = productId?.toString().trim();

    if (!isValidRequestBody(data)) return res.status(400).send({ status: false, message: 'please provid body data' });

    if (!productId) return res.status(400).send({ status: false, message: 'please enter the product ID' });

    if (cartId) {
      cartId = cartId?.toString().trim();

      if (!cartId) return res.status(400).send({ status: false, message: 'please enter the cart ID' });

      if (!isValidObjectId(cartId)) return res.status(400).send({ status: false, message: 'Cart ID is not valid ' });
    }

    if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'please enter the valid product Id' });

    const productExsists = await productModel.find({ _id: productId, isDeleted: false });

    if (productExsists.length === 0) return res.status(400).send({ status: false, message: ' product  don\'t exsist in data base' });

    const prices = productExsists[0].price;

    const cartExists = await cartModel.findOne({ userId });

    if (cartExists) {
      const cartExists1 = await cartModel.findOne({ userId, _id: cartId });

      if (!cartId) return res.status(400).send({ status: false, message: ' cart Id is has been genrated already please enter the cart Id' });

      if (!cartExists1) return res.status(400).send({ status: false, message: ' cart ID cart is not mathced with this user ID' });

      if (cartId) {
        const ifSameProduct = await cartModel.findOneAndUpdate({ 'items.productId': productId, userId }, { $inc: { 'items.$.quantity': 1, totalPrice: prices } }, { new: true });

        if (ifSameProduct) return res.status(200).send({ status: false, message: 'product added', Data: ifSameProduct });

        const newItems = {
          productId,
          quantity: 1,
        };

        const addingPrduct = await cartModel.findOneAndUpdate(
          { _id: cartId, userId },
          {
            $push: { items: newItems },
            $inc: { totalPrice: prices, totalItems: 1 },
          },
          { new: true },
        );

        return res.status(201).send({ status: true, message: 'product is added to the cart', data: addingPrduct });
      }
    }
    const newItems1 = {
      productId,
      quantity: 1,
    };

    const addingCartId = await cartModel.create({
      items: newItems1, userId, totalPrice: prices, totalItems: 1,
    });

    res.status(201).send({ status: true, message: 'product is added to the cart', data: { addingCartId } });
  } catch (e) {
    res.status(500).send({ satus: false, error: e.message });
  }
};

//= ======================== Get Cart details (GET /users/:userId/cart)=========================//

const getCart = async (req, res) => {
  try {
    const userId = req.params.userId.toString().trim();

    const findCart = await cartModel.findOne({ userId }).populate('items.productId', {
      title: 1, price: 1, productImage: 1, availableSizes: 1,
    })
      .select({ createdAt: 0, updatedAt: 0, __v: 0 });

    if (!findCart) {
      return res.status(404).send({ status: false, message: `Cart doesn't exists by ${userId} ` });
    }

    return res.status(200).send({ status: true, message: 'Successfully fetched cart.', data: findCart });
  } catch (err) {
    return res.status(500).send({ status: false, message: `Error is : ${err}` });
  }
};

//= ====================== Update Cart details (PUT /users/:userId/cart)========================//

const updateCart = async function (req, res) {
  try {
    const { userId } = req.params;
    let { productId, cartId, removeProduct } = req.body;

    productId = productId?.toString().trim();
    cartId = cartId?.toString().trim();
    removeProduct = removeProduct?.toString().trim();

    if (!cartId) {
      return res.status(400).send({ status: false, message: 'cartId be must required...' });
    }
    if (!productId) {
      return res.status(400).send({ status: false, message: 'productId must be required...' });
    }
    if (removeProduct != 0 && !removeProduct) {
      return res.status(400).send({ status: false, message: 'removeProduct key must be required...' });
    }

    if (!isValidObjectId(cartId)) {
      return res.status(400).send({ status: false, message: 'Not a valid cartId' });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: 'Not a valid ProductId' });
    }

    if (!(removeProduct == '1' || removeProduct == '0')) {
      return res.status(400).send({ status: false, message: 'removeProduct value only can be 0 or 1' });
    }

    const cartInDB = await cartModel.findOne({ _id: cartId });

    if (!cartInDB) {
      return res.status(404).send({ status: false, message: 'cartId does not exist' });
    }

    const productInDB = await productModel.findOne({ _id: productId, isDeleted: false });

    if (!productInDB) {
      return res.status(404).send({ status: false, message: 'productId does not exist' });
    }

    const productIdInCart = await cartModel.findOne({ userId, 'items.productId': productId });

    if (!productIdInCart) {
      return res.status(404).send({ status: false, message: 'productId does not exist in this cart' });
    }
    const { items } = cartInDB;
    const getPrice = productInDB.price;

    for (let i = 0; i < items.length; i++) {
      if (items[i].productId === productId) {
        const totelProductprice = items[i].quantity * getPrice;

        if (removeProduct === 0 || (items[i].quantity === 1 && removeProduct === 1)) {
          const removeCart = await cartModel.findOneAndUpdate(
            { userId },
            {
              $pull: { items: { productId } },
              $inc: {
                totalPrice: -totelProductprice,
                totalItems: -1,
              },
            },
            { new: true },
          );

          return res.status(200).send({ status: true, message: 'sucessfully removed product from cart', data: removeCart });
        }
        const product = await cartModel.findOneAndUpdate({ 'items.productId': productId, userId }, { $inc: { 'items.$.quantity': -1, totalPrice: -getPrice } }, { new: true });

        return res.status(200).send({ status: true, message: 'sucessfully decrease one quantity of product', data: product });
      }
    }
  } catch (error) {
    return res.status(500).send({ status: false, error: error.message });
  }
};

//= ===================== Delete Cart Items details (DELETE /users/:userId/cart)==================//

const deleteCart = async (req, res) => {
  try {
    const userId = req.params.userId.toString().trim();

    const findUserCart = await cartModel.findOne({ userId });

    if (!findUserCart) {
      return res.status(404).send({ status: false, message: 'No user found' });
    }

    if (findUserCart.items.length === 0) {
      return res.status(404).send({ status: false, message: 'Products are already deleted in the cart' });
    }
    const removedCart = await cartModel.findOneAndUpdate(
      { userId },
      { $set: { items: [], totalItems: 0, totalPrice: 0 } },
      { new: true },
    );
    return res.status(204).send({ status: false, message: 'Cart deleted succesfully', data: removedCart });
  } catch (error) {
    res.status(500).send({ status: false, message: error.message });
  }
};

module.exports = {
  createCart, getCart, updateCart, deleteCart,
};
