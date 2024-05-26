require('dotenv').config();
const TresComas = require('./tres-comasv3.js');

console.log(process.env);

let files = new TresComas('mongodb://localhost/files', 3007, {
    api_base_uri: false,
    activeLogRequest: true,
    active_cors: true,
    collection_name: "files",
    public_folder: "archive",
    path_folder: "files",
    allow_public: true,
    limits: {
        fileSize: Infinity,
        filesArray: 10
    },
    structure_folder: "date", //date, root, extension, custom, alphabetic
    custom_folder_name: false,
    engine: "aws-s3", //"local", //aws-s3
    connect: {
        bucket: process.env.S3_BUCKET_NAME,
        acl: "public-read",
        contentDisposition: "inline", // 'attachment'
        serverSideEncryption: false, // 'AES256'
        contentEncoding: false,
        region: process.env.AWS_REGION,
        aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
        aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY
    }
    /*secure: {
        user: "tres-comas",
        password: "Russ-Hanneman"
    }*/
});

files.initialize();
files.start();
