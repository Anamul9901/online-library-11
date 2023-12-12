const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId, Int32 } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://assignment-11-22b1b.web.app',
    'https://assignment-11-22b1b.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@assignment11.6lydkgh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('token in the middleware: ', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded; // decoded means: req/client side theke asa token code take vengge real email & code ber kora
    next();
  })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const categoriCollection = client.db('booksDB').collection('bookCategori')
    const booksCollection = client.db('booksDB').collection('books');
    const userCollection = client.db('booksDB').collection('users');
    const borrowBookCollction = client.db('booksDB').collection('borrow');


    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log('user for token: ', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send(token);
    })


    // logout korle cookie theke token remove
    app.post('/logout', async (req, res) => {
      const user = res.body;
      console.log('logging out: ', user)
      res
        .clearCookie('token', { maxAge: 0 })
        .send({ success: true })
    })




    app.get('/categori', async (req, res) => {
      const result = await categoriCollection.find().toArray();
      res.send(result);
    })

    app.get('/books', async (req, res) => {
      const result = await booksCollection.find().toArray();
      res.send(result);
    })

    app.post('/books', async (req, res) => {
      const newBook = req.body;
      console.log("new book :", newBook);
      const result = await booksCollection.insertOne(newBook);
      console.log(result);
      res.send(result);
    })

    //find book by unic id
    app.get('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await booksCollection.findOne(query);
      res.send(result);
    })


    app.put('/books/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const fulter = { _id: new ObjectId(id) || id}
      const options = { upsert: true }
      const updatedBook = {
        $set: {
          Name: data.Name,
          Category: data.Category,
          image: data.image,
          AuthorName: data.AuthorName,
          Rating: data.Rating,
          Quantity: data.Quantity || data.Quantity2 || data.Quantity3,
        }
      }
      const result = await booksCollection.updateOne(fulter, updatedBook, options)
      res.send(result);
    })




    // user 
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      console.log('new suer: ', newUser);
      const result = await userCollection.insertOne(newUser)
      res.send(result);
    })


    // borrow book collction
    app.get('/borrow', verifyToken, async (req, res) => {
      console.log(req.query.userEmail);
      console.log('token owner info: ', req.user);
      if (req.user.email !== req.query.userEmail) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      let query = {};
      if (req.query?.userEmail) {
        query = { userEmail: req.query.userEmail }
      }
      const result = await borrowBookCollction.find(query).toArray();
      res.send(result);
    })

    app.post('/borrow', async (req, res) => {
      const newBorrow = req.body;
      console.log(newBorrow);
      const result = await borrowBookCollction.insertOne(newBorrow);
      res.send(result);
    })

    app.delete('/borrow/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: id || new ObjectId(id)};
      const result = await borrowBookCollction.deleteOne(query);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get('/', (req, res) => {
  res.send('Crud is running.....')
})

app.listen(port, () => {
  console.log(`App is running on port ${port}`)
})