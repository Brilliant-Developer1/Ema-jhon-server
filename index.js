const express = require('express');
const { MongoClient } = require('mongodb'); // mongodb data
require('dotenv').config(); // for secure env data
const cors = require('cors');  // For cors bloking
const ObjectId = require('mongodb').ObjectId;
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

// Firebase admin initialization

var serviceAccount = require("./ema-john-474a1-firebase-adminsdk-rzvu0-3172e46b27.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors())      // For cors blocking
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ezvo3.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// To add token
async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const idToken = req.headers.authorization.split('Bearer ')[1]; //bearer ke token theke alada korar jonno
    try{
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}
// Insert a Document to mongo data base
async function run() {
    try {
      await client.connect();
      // console.log("conected to db");
      const database = client.db("emaJhonShop");
      const productsCollection = database.collection("products");
      const orderCollection = database.collection("orders");
      
      // GET data from server
      app.get("/products", async(req,res) => {
         const cursor = productsCollection.find({});
         const page = req.query.page;
         const size = parseInt(req.query.size);
         let products;
         const count = await cursor.count();
         if(page) {
            products = await cursor.skip(page * size).limit(size).toArray();
         }
         else{
           products = await cursor.toArray(); //.limit(10)
         }
         res.send({
           count,
           products
         }) ; 
      });
      // POST API used in useCart
      app.post("/products/byKeys", async(req, res) => {
         const keys = req.body; 
        //  console.log("clicked the post" , req.body);
        const query = {key: {$in: keys}}
         const products = await productsCollection.find(query).toArray();
         console.log(products);
        res.json(products)
        // res.send("check")
      });

      // Get Orders from server
      app.get("/orders",verifyToken, async (req,res) => {
        const email = req.query.email;
        if(req.decodedUserEmail === email){
          const query = {email: email}
          const cursor = orderCollection.find(query);
          const orders = await cursor.toArray();
          res.json(orders) ;
        } else{
          res.status(401).json({Message: 'User Not authorized'})
        }
        
      })
      // Add Orders
      app.post('/orders', async(req, res) => {
        
        const order = req.body;
        order.createdAt = new Date();
        const result = await orderCollection.insertOne(order)
        res.json(result);
      })
    } finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Running the Ema-jhon server")
});

app.listen(port, () => {
    console.log("Server Running on", port);
})
/* 
Get  Orders from server without id token er code
const email = req.query.email;
if(email){
          query = {email: email}
        }
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.json(orders) ;
*/