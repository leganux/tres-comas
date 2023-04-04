let tresComas = require('./index')


let files = new tresComas('mongodb://localhost/files', 3007,
    {
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
        structure_folder: "date",//date, root, extension,custom, alphabetic
        custom_folder_name: false,
        engine: "local", //"local", //aws-s3
        connect: {
            bucket: 'trescomas',
            acl: "public-read",
            contentDisposition: "inline",// 'attachment',
            serverSideEncryption: false, //'AES256',
            contentEncoding: false,
            region: "us-east-2",
            aws_access_key_id: "1234567890",
            aws_secret_access_key: "1234567890",

        },
        secure: {
            user: "tres-comas",
            password: "Russ-Hanneman"
        }
    })
files.initialize()
files.start()
