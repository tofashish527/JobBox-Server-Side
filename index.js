const express = require('express')
const cors=require('cors')
const app = express()
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.3b76qlc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const jobsCollection=client.db('Job-Portal').collection('jobs');
    const applicationsCollection=client.db('Job-Portal').collection('applications');

    app.get('/jobs',async(req,res)=>{
        const email=req.query.email;
        const query={}
        if(email)
        {
          query.HRemail=email;
        }
        //const cursor=await jobsCollection.find(query);
        //const result=await cursor.toArray();
        const result = await jobsCollection.find(query).toArray();
        //console.log(result);
        res.send(result);
        console.log(result);
    })

    app.get('/jobs/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id: new ObjectId(id)}
        const result=await jobsCollection.findOne(query);
        res.send(result);
    })

    app.post('/jobs',async(req,res)=>{
        const newJob=req.body;
        console.log(newJob);
        const result=await jobsCollection.insertOne(newJob);
        res.send(result)
    })

    app.get('/applications',async(req,res)=>{
      const email=req.query.email;
      const query={
        applicant:email
      }
      const result=await applicationsCollection.find(query).toArray();

      //bad way to aggregate data
      for(const application of result)
      {
        const jobId=application.jobId;
        const jobQuery={_id:new ObjectId(jobId)}
        const job=await jobsCollection.findOne(jobQuery);
        application.company=job.company;
        application.title=job.title;
        application.company_logo=job.company_logo
      }
      res.send(result);
    })

    app.get('/applications/job/:job_id',async(req,res)=>{
      const job_id=req.params.job_id;
      const query={jobId:job_id}
      const result=await applicationsCollection.find(query).toArray()
      res.send(result)
    })
    app.post('/applications',async(req,res)=>{
        const application=req.body;
        const result=await applicationsCollection.insertOne(application);
        res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('JOB-Portal')
})

app.listen(port, () => {
  console.log(`Job Portal server is running on PORT ${port}`)
})
