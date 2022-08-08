const express = require('express')
const router = express.Router()

const{createUser,loginUser,updateUser,getById} =require('../controllers/userController')
const {updateProduct,createProduct,getProduct,getProductById,deleteProductById} = require('../controllers/productController')
const{createCart,getCart,updateCart,deleteCart}= require('../controllers/cartController')
const{orderCreation,updateOrder} = require("../controllers/orderController")
const {authentication,authorization} = require('../middleware/auth')



//User's Api
router.post("/register",createUser) 
router.post("/login",loginUser) 
router.get("/user/:userId/profile",authentication,authorization,getById) // m
router.put("/user/:userId/profile",authentication,authorization,updateUser) 

//product's Api
router.post("/products",createProduct) 
router.get("/products",getProduct) 
router.get("/products/:productId",getProductById) 
router.put("/products/:productId",updateProduct) 
router.delete("/products/:productId",deleteProductById) 

//Cart's Api
router.post("/users/:userId/cart",authentication,authorization,createCart)
router.get("/users/:userId/cart",authentication,authorization,getCart) 
router.put("/users/:userId/cart",authentication,authorization,updateCart) 
router.delete("/users/:userId/cart",authentication,authorization,deleteCart) 


//Order's Api
router.post("/users/:userId/orders",authentication,authorization,orderCreation) 
router.put("/users/:userId/orders",authentication,authorization,updateOrder)  //m



//if api is invalid OR wrong URL
router.all("/*", function (req, res) {
  res.status(404).send({ status: false, msg: "The api you requested is not found" });
});

module.exports = router;