const express = require('express')
const cors=require('cors')
const app = express()
const cookieParser=require('cookie-parser')
const jwt=require('jsonwebtoken')
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

//middleware
//app.use(cors());
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(express.json());
app.use(cookieParser())

const logger=(req,re,next)=>{
    console.log('inside the logger middlewear')
    next()
}

const verifyToken=(req,res,next)=>{
  token=req?.cookies?.token
  //console.log('coookie in the middleware',token)
  if(!token)
  {
    return res.status(401).send({message:'unauthorized'})
  }
  //verify
  jwt.verify(token,process.env.JWT_SECRET,(error,decoded)=>{
    if(error)
    {
      return res.status(401).send({message:'unauthorized'})
    }
      // console.log(decoded)
      req.decoded=decoded;
      next()
  })
  
}

// const verifyFirebaseToken=async(req,res,next)=>{
//   const authHeader=req.headers?.authorization;
//   const token=authHeader.split(' ')[1];
//   //console.log(token)
//   if(token)
//   {
//     return res.status(401).send({message:'unauthorized'})
//   }
//   const userInfo=await admin.auth().verifyIdToken(token);
//   console.log(userInfo)
//   req.tokenEmail=userInfo.email;
//   next();
// }
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

    //jwt token related
    app.post('/jwt',async(req,res)=>{
      const userData=req.body;
      //const user={email};
      const token=jwt.sign(userData,process.env.JWT_SECRET,{expiresIn:'1h'})

      res.cookie('token',token,{
        httpOnly:true,
        secure:false
      })
      res.send({success:true})
    })
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
        //console.log(result);
    })

     app.get('/jobs/applications',async(req,res)=>{
      const email=req.query.email;
      const query={HRemail:email};
      const jobs=await jobsCollection.find(query).toArray();

      //should use aggregate to have optimum data fetching
      for(const job of jobs)
      {
        const applicationQuery={jobId:job._id.toString()}
        const applicationCount=await applicationsCollection.countDocuments(applicationQuery)
        job.applicationCount=applicationCount;
        //console.log(applicationCount)
      }
      res.send(jobs)
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

    app.get('/applications',logger,verifyToken,async(req,res)=>{
      const email=req.query.email;
      if(email!==req.decoded.email){
        return res.status(403).send({message:'forbidden'})
      }
      const query={
        applicant:email
      }

      //console.log('inside api',req.cookies)
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

    app.patch('/applications/:id',async(req,res)=>{
      const id=req.params.id;
      const filter={_id:new ObjectId(id)}
      const updatedDoc={
        $set:{
          status:req.body.status
        }
      }
      const result=await applicationsCollection.updateOne(filter,updatedDoc)
      res.send(result)
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
