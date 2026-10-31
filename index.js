
import express from 'express';
import { MongoClient } from 'mongodb';
import { ObjectId } from "mongodb";
import cors from 'cors';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from 'jose';
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.get

const mongoClient = await connectToMongoDB();
const db = mongoClient.db('wanderlust');
const destinationCollection = db.collection('destination');
const bookingCollection = db.collection('bookings')




const verifyApi = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check authorization header
  if (!authHeader) {
    return res.status(401).send({
      msg: "Unauthorized: Token not found",
    });
  }

  // Extract token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({
      msg: "Unauthorized: Invalid token",
    });
  }


const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))
const {payload} = await jwtVerify(token, JWKS)

console.log(payload);

  next();
};



app.post('/add-destination', verifyApi, async (req, res) => {
  const data = req.body;
  const result = await destinationCollection.insertOne(data);
  console.log(result);
  res.send(result);
})

app.get('/destinations', async (req, res) => {
  const result = await destinationCollection.find({}).toArray();
  res.send(result);
})


app.get('/featured-destination', async(req, res) => {
  const result = await destinationCollection.find(). limit(5).toArray()
  res.send(result)
})
app.get('/destination/:id', verifyApi, async (req, res) => {
  const id = req.params.id;

  const result = await destinationCollection.findOne({
    _id: new ObjectId(id)
  });

  res.send(result);
});


app.patch("/destination/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        message: "Invalid destination ID",
      });
    }

    console.log("Received name:", data.name);

    const filter = { _id: new ObjectId(id) };

    const beforeUpdate = await destinationCollection.findOne(filter);

    console.log("Name before update:", beforeUpdate?.name);

    const result = await destinationCollection.updateOne(
      filter,
      { $set: data }
    );

    const afterUpdate = await destinationCollection.findOne(filter);

    console.log("Update result:", result);
    console.log("Name after update:", afterUpdate?.name);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Destination not found",
      });
    }

    res.send({
      message: "Destination update checked",
      result,
      updatedDestination: afterUpdate,
    });
  } catch (error) {
    console.error("Update destination error:", error);

    res.status(500).send({
      message:
        error instanceof Error
          ? error.message
          : "Failed to update destination",
    });
  }
});

// Create Booking
app.post("/booking", async (req, res) => {
  try {
    const { _id, ...data } = req.body;

    // একই User একই Destination আগে বুক করেছে কি না
    const existingBooking = await bookingCollection.findOne({
      email: data.email,
      destinationId: data.destinationId,
    });

    if (existingBooking) {
      return res.status(409).send({
        success: false,
        message: "You have already booked this destination!",
      });
    }

    const result = await bookingCollection.insertOne({
      ...data,
      bookingDate: new Date(),
      status: "Confirmed",
    });

    res.status(201).send({
      success: true,
      message: "Booking successful",
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error("Booking error:", error);

    res.status(500).send({
      message: "Failed to create booking",
    });
  }
});;


// Get My Bookings
app.get("/my-bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const result = await bookingCollection
      .find({ email: email })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).send({
      message: "Failed to get bookings",
    });
  }
});


// Delete Booking
app.delete("/my-bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let booking = await bookingCollection.findOne({
      _id: id,
    });

    if (!booking && ObjectId.isValid(id)) {
      booking = await bookingCollection.findOne({
        _id: new ObjectId(id),
      });
    }

    if (!booking) {
      return res.status(404).send({
        message: "Booking not found",
      });
    }

    const result = await bookingCollection.deleteOne({
      _id: booking._id,
    });

    res.send(result);
  } catch (error) {
    console.error("Delete booking error:", error);

    res.status(500).send({
      message: "Failed to cancel booking",
    });
  }
});

app.delete('/destination/:id', async (req, res) => {
  const { id } = req.params;
  const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(result);
})


app.get('/', (req, res) => {
  res.send('Hello, World!');
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


export default app