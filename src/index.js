/* eslint-disable import/extensions */
const express = require('express');
const multer = require('multer');
const route = require('./routes/routes.js');
const { connectDB } = require('./config/db.js');

const app = express();

connectDB();
app.use(express.json());
app.use(multer().any());

app.use('/', route);

module.exports = app;
