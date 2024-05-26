const fs = require("fs");
const http = require("http");
const https = require("https");
const apiato = require("apiato");
const makeDir = require("makedir").makedir;
const express = require("express");
const bodyParser = require("body-parser");
const getId = require("docker-container-id");
const morgan = require("morgan");
const moment = require("moment");
const osu = require("node-os-utils");
const hooli = require("hooli-logger-client");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

class TresComas {
  constructor(s, i = 3007, o = { api_base_uri: false, activeLogRequest: false, active_cors: false, collection_name: "files", public_folder: "archive", limits: { fileSize: Infinity, filesArray: 10 }, engine: "aws-s3", connect: false, app: false, mongoose: false }, n = {}) {
    console.log(`
    v2.0.0
    Welcome to Tres Comas
                                                                                                                         
 ,.--.   ,.--.   ,.--.   
//    \\ //    \\ //    \\  
\\\\     |\\\\     |\\\\     | 
 \`'-) /  \`'-) /  \`'-) /  
   /.'     /.'     /.'   
                          
               This is a project made by leganux.net (c) 2021-2024 
                      ______________________________________
               Read the docs at https://www.npmjs.com/package/tres-comas
                                
                                                                                                                            
    `);

    try {
      this.instancedMongoose = false;
      this.mongoose = o.mongoose || require("mongoose");
      this.instancedMongoose = !!o.mongoose;
      if (!s) throw new Error("You must add the MongoDB URI");

      this.app = o.app || express();
      this.instancedApp = !!o.app;

      if (!this.instancedApp) {
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(bodyParser.json());
      }

      this.activeLogRequest = o.activeLogRequest || false;

      if (n.private && n.cert && n.port && !this.instancedApp) {
        this.privateKey = fs.readFileSync(n.private, "utf8");
        this.certificate = fs.readFileSync(n.cert, "utf8");
        this.credentials = { key: this.privateKey, cert: this.certificate };
        this.httpsServer = https.createServer(this.credentials, this.app);
      }

      if (!this.instancedApp) this.httpServer = http.createServer(this.app);

      if (!this.instancedMongoose) {
        this.mongoose.connect(s, { useUnifiedTopology: true, useNewUrlParser: true });
        this.mongoose.set("strictQuery", true);
      }

      this.db = this.mongoose.connection;

      this.s3Client = new S3Client({ region: o.connect?.region || "us-east-2" });

      this.connect = {
        bucket: o.connect?.bucket || "trescomas",
        acl: o.connect?.acl || "public-read",
        contentDisposition: o.connect?.contentDisposition || "inline",
        serverSideEncryption: o.connect?.serverSideEncryption || false,
        contentEncoding: o.connect?.contentEncoding || false,
        custom_folder_name: o.connect?.custom_folder_name || "custom",
        region: o.connect?.region || "us-east-2",
        aws_access_key_id: o.connect?.aws_access_key_id || process.env.AWS_ACCESS_KEY_ID || false,
        aws_secret_access_key: o.connect?.aws_secret_access_key || process.env.AWS_SECRET_ACCESS_KEY || false,
      };

      if (!this.connect.bucket) throw new Error("Bucket name is not configured");
      if (!this.connect.region) throw new Error("Region is not configured");
      if (!this.connect.aws_access_key_id || !this.connect.aws_secret_access_key) throw new Error("Access key or secret is not configured");

      process.env.AWS_ACCESS_KEY_ID = this.connect.aws_access_key_id;
      process.env.AWS_SECRET_ACCESS_KEY = this.connect.aws_secret_access_key;

      this.engine = o.engine || "aws-s3";
      this.secure = o.secure || false;
      this.api_base_uri = o.api_base_uri || "/file/";
      this.activeLogRequest = o.activeLogRequest || false;
      this.public_folder = o.public_folder || "archive";
      this.structure_folder = o.structure_folder || "date";
      this.custom_folder_name = o.custom_folder_name || false;
      this.collection_name = o.collection_name || "files";
      this.path_folder = o.path_folder || "/files";
      this.limits = o.limits || { fileSize: Infinity, filesArray: 10 };
      this.allow_public = o.allow_public || false;

      if (o.active_cors) {
        this.app.use((req, res, next) => {
          res.header("Access-Control-Allow-Origin", "*");
          res.header("Access-Control-Allow-Headers", "Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method");
          res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
          res.header("Allow", "GET, POST, OPTIONS, PUT, DELETE");
          next();
        });
      }

      this.filesMSchema = new this.mongoose.Schema({
        url: { type: String },
        name: { type: String },
        extension: { type: String },
        filename: { type: String },
        path: { type: String },
        dest: { type: String },
        engine: { type: String },
        allow_public: { type: Boolean },
        token: { type: String },
        link: { type: String },
      }, { timestamps: true });

      this.filesModel = this.mongoose.model(this.collection_name, this.filesMSchema, this.collection_name);

      this.setupEndpoints();
    } catch (error) {
      console.error(error);
    }
  }

  decodeBase64(input) {
    return Buffer.from(input, "base64").toString("utf8");
  }

  async setupEndpoints() {
    const s = this;

    const uploadHandler = multer.memoryStorage();
    const upload = multer({ storage: uploadHandler, limits: { fileSize: s.limits.fileSize } });

    this.app.get("/", async (req, res) => {
      res.status(200).json({
        success: true,
        code: 200,
        error: "",
        message: "Tres comas (,,,) has been successfully started",
        container_id: await getId(),
      });
    });

    this.app.post(s.api_base_uri + "upload/array", upload.array("files", s.limits.filesArray), this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = req.files;
        const response = await s.handleFileUpload(files, req);
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "Upload OK",
          container_id: await getId(),
          data: response,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Upload Error",
          container_id: await getId(),
        });
      }
    });

    this.app.post(s.api_base_uri + "upload/single", upload.single("file"), this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = [req.file];
        const response = await s.handleFileUpload(files, req);
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "Upload OK",
          container_id: await getId(),
          data: response,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Upload Error",
          container_id: await getId(),
        });
      }
    });

    this.app.post(s.api_base_uri + "upload/", upload.any(), this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = req.files;
        const response = await s.handleFileUpload(files, req);
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "Upload OK",
          container_id: await getId(),
          data: response,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Upload Error",
          container_id: await getId(),
        });
      }
    });

    this.app.post(s.api_base_uri + "upload/f/:folder/", upload.any(), this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = req.files;
        const response = await s.handleFileUpload(files, req, req.params.folder);
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "Upload OK",
          container_id: await getId(),
          data: response,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Upload Error",
          container_id: await getId(),
        });
      }
    });

    this.app.post(s.api_base_uri + "upload/:public", upload.any(), this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = req.files;
        const response = await s.handleFileUpload(files, req);
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "Upload OK",
          container_id: await getId(),
          data: response,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Upload Error",
          container_id: await getId(),
        });
      }
    });

    this.app.post(s.api_base_uri + "delete", this.authMiddleware.bind(this), async (req, res) => {
      try {
        const token = req.body.token;
        const file = await s.filesModel.findOneAndDelete({ token });
        if (file) {
          const deleteParams = {
            Bucket: s.connect.bucket,
            Key: file.filename,
          };
          await s.s3Client.send(new DeleteObjectCommand(deleteParams));
          res.status(200).json({
            success: true,
            code: 200,
            error: false,
            message: "Delete OK",
            container_id: await getId(),
          });
        } else {
          res.status(404).json({
            success: false,
            code: 404,
            error: true,
            message: "File not found",
            container_id: await getId(),
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "Delete Error",
          container_id: await getId(),
        });
      }
    });

    this.app.get(s.api_base_uri + "list", this.authMiddleware.bind(this), async (req, res) => {
      try {
        const files = await s.filesModel.find();
        res.status(200).json({
          success: true,
          code: 200,
          error: false,
          message: "List OK",
          container_id: await getId(),
          data: files,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          code: 500,
          error: error,
          message: "List Error",
          container_id: await getId(),
        });
      }
    });
  }

  async handleFileUpload(files, req, customFolderName = false) {
    const s = this;
    const response = [];
    for (const file of files) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const customFolder = customFolderName || s.custom_folder_name || "custom";
      const fileKey = `${customFolder}/${fileName}`;
      const uploadParams = {
        Bucket: s.connect.bucket,
        Key: fileKey,
        Body: file.buffer,
        ACL: s.connect.acl,
        ContentDisposition: s.connect.contentDisposition,
        ContentEncoding: s.connect.contentEncoding,
        ServerSideEncryption: s.connect.serverSideEncryption,
      };
      const data = await s.s3Client.send(new PutObjectCommand(uploadParams));
      const fileData = {
        url: data.Location || `https://${s.connect.bucket}.s3.${s.connect.region}.amazonaws.com/${fileKey}`,
        name: file.originalname,
        extension: fileExt,
        filename: fileKey,
        path: `/${customFolder}`,
        dest: `/${customFolder}`,
        engine: s.engine,
        allow_public: s.allow_public,
        token: uuidv4(),
        link: s.allow_public ? data.Location : "",
      };
      await new s.filesModel(fileData).save();
      response.push(fileData);
    }
    return response;
  }

  authMiddleware(req, res, next) {
    // Implement authentication logic here
    next();
  }

  start(port = this.port, secure = this.secure) {
    if (secure && this.httpsServer) {
      this.httpsServer.listen(port, () => {
        console.log(`HTTPS Server listening on port ${port}`);
      });
    } else if (this.httpServer) {
      this.httpServer.listen(port, () => {
        console.log(`HTTP Server listening on port ${port}`);
      });
    }
  }
}

module.exports = TresComas;
