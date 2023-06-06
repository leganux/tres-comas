const fs = require('fs');
const http = require('http');
const https = require('https');


const {promisify} = require('util');


//import APIATO
let apiato = require('apiato')
//initialize microservice objecto for employee colection
let ms_ = new apiato();
let makeDir = require('makedir').makedir

const express = require('express');
const bodyParser = require('body-parser');
const getId = require('docker-container-id');

const morgan = require('morgan');
const moment = require('moment');
let osu = require('node-os-utils')
let hooli = require("hooli-logger-client")
let path = require('path')


const {S3Client, PutObjectCommand, GetObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer')
const multerS3 = require('multer-s3')

const {v4: uuidv4} = require('uuid');

require('dotenv').config()

let tresComas = function (mongoDBUri, port = 3007, options = {
    api_base_uri: false,
    activeLogRequest: false,
    active_cors: false,
    collection_name: "files",
    public_folder: "archive",
    limits: {
        fileSize: Infinity,
        filesArray: 10
    },
    engine: "aws-s3", //"local", //aws-s3
    connect: false,
    app: false,
    mongoose: false


}, ssl_config = {}) {

    console.log(`
    v1.0.2
    Welcome to Tres Comas
                                                                                                                         
 ,.--.   ,.--.   ,.--.   
//    \\ //    \\ //    \\  
\\\\     |\\\\     |\\\\     | 
 \`'-) /  \`'-) /  \`'-) /  
   /.'     /.'     /.'   
                          
               This is a project made by leganux.net (c) 2021-2023 
                      ______________________________________
               Read the docs at https://www.npmjs.com/package/tres-comas
                                
                                                                                                                            
`)

    try {
        this.instancedMongoose = false
        this.mongoose = {}
        if (!options.mongoose) {
            this.mongoose = require("mongoose");

        } else {
            this.mongoose = options.mongoose
            this.instancedMongoose = true
        }


        if (!mongoDBUri) {
            throw new Error('You must to add the mongo db URI')
        }
        this.app = {}
        this.instancedApp = false

        if (options.app) {
            this.app = options.app
            this.instancedApp = true
        } else {
            this.app = express()
            this.app.use(bodyParser.urlencoded({extended: true}));
            this.app.use(bodyParser.json());
            this.instancedApp = false
        }


        this.activeLogRequest = false

        if (ssl_config && ssl_config.private && ssl_config.cert && ssl_config.port && !this.instancedApp) {
            this.privateKey = fs.readFileSync(ssl_config.private, 'utf8');
            this.certificate = fs.readFileSync(ssl_config.cert, 'utf8');
            this.credentials = {key: this.privateKey, cert: this.certificate};
            this.httpsServer = https.createServer(this.credentials, this.app);
        }

        if (!this.instancedApp) {
            this.httpServer = http.createServer(this.app);
        }

        if (!this.instancedMongoose) {
            this.mongoose.connect(mongoDBUri, {useUnifiedTopology: true, useNewUrlParser: true,});
            this.mongoose.set('strictQuery', true);
        }

        this.db = this.mongoose.connection;
        this.s3 = {}
        this.PARAMS = {}

        this.api_base_uri = '/file/';
        this.allow_public = false;
        this.path_folder = "/files";
        this.engine = "aws-s3"
        this.collection_name = "files"
        this.secure = false
        this.public_folder = "archive"
        this.limits = {
            fileSize: Infinity,
            filesArray: 10
        }
        this.structure_folder = "date"// root, extension,custom, alphabetic
        this.custom_folder_name = false
        this.connect = {
            bucket: 'trescomas',
            acl: "public-read",
            contentDisposition: "inline",// 'attachment',
            serverSideEncryption: false, //'AES256',
            contentEncoding: false,
            custom_folder_name: 'custom',
            region: "us-east-2",
            aws_access_key_id: false,
            aws_secret_access_key: false,
        }

        if (options?.connect) {
            this.connect.bucket = options?.connect?.bucket || false
            this.connect.acl = options?.connect?.acl || "public-read"
            this.connect.contentDisposition = options?.connect?.contentDisposition || "inline"
            this.connect.serverSideEncryption = options?.connect?.serverSideEncryption || false
            this.connect.contentEncoding = options?.connect?.contentEncoding || false
            this.connect.region = options?.connect?.region || "us-east-2"
            this.connect.aws_access_key_id = options?.connect?.aws_access_key_id || process.env.AWS_ACCESS_KEY_ID || false
            this.connect.aws_secret_access_key = options?.connect?.aws_secret_access_key || process.env.AWS_SECRET_ACCESS_KEY || false
            if (!this.connect.bucket) {
                throw new Error('El nombre del bucket no esta configurado')
                return
            }
            if (!this.connect.region) {
                throw new Error('La region no esta configurada')
                return
            }
            if (!this.connect.aws_access_key_id || !this.connect.aws_secret_access_key) {
                throw new Error('El access key o secret no esta configurado')
                return
            }
            process.env.AWS_ACCESS_KEY_ID = this.connect.aws_access_key_id
            process.env.AWS_SECRET_ACCESS_KEY = this.connect.aws_secret_access_key
        }

        if (options.engine) {
            this.engine = options.engine
        }
        if (options.secure) {
            this.secure = options.secure
        }

        if (options.api_base_uri) {
            this.api_base_uri = options.api_base_uri
        }
        if (options.activeLogRequest) {
            this.activeLogRequest = options.activeLogRequest
        }
        if (options?.active_cors) {
            this.app.use((_req, res, next) => {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
                res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
                res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
                next();
            });
        }
        if (options?.public_folder) {
            this.public_folder = options.public_folder
        }
        if (options?.structure_folder) {
            this.structure_folder = options.structure_folder
        }
        if (options?.custom_folder_name) {
            this.custom_folder_name = options.custom_folder_name || 'custom'
        }
        if (options?.collection_name) {
            this.collection_name = options.collection_name
        }
        if (options?.path_folder) {
            this.path_folder = options.path_folder
        }
        if (options?.limits) {
            this.limits.fileSize = options?.limits?.fileSize || Infinity
            this.limits.filesArray = options?.limits?.filesArray || 10
        }
        if (options.allow_public) {
            this.allow_public = options.allow_public
        }

        let el__ = this
        el__.db_timestamps = true

        let Schema = this.mongoose.Schema;
        this.filesMSchema = new Schema({
            url: {
                type: String
            },
            name: {
                type: String
            },
            extension: {
                type: String
            },
            filename: {
                type: String
            },
            path: {
                type: String
            },
            dest: {
                type: String
            },
            engine: {
                type: String
            },
            allow_public: {
                type: Boolean
            },
            token: {
                type: String
            },
            link: {
                type: String
            },
        }, {timestamps: el__.db_timestamps})
        this.filesModel = this.mongoose.model(el__.collection_name, this.filesMSchema, el__.collection_name)
        this.decodeBase64 = function (data) {
            return Buffer.from(data, 'base64').toString('utf8')
        }

        this.initialize = function () {
            let el = this
            if (el.activeLogRequest) {
                el.app.use(morgan(function (tokens, req, res) {
                    return [
                        moment().format('YYYY-MM-DD hh:mm:ss'),
                        tokens.method(req, res),
                        tokens.url(req, res),
                        tokens.status(req, res),
                        tokens['response-time'](req, res), 'ms'
                    ].join('  ');
                }))
            }

            if (el.allow_public) {
                el.app.use('/' + el.public_folder, express.static(el.path_folder))
            }


            let upload = {}

            if (el.engine == 'aws-s3') {
                const s3 = new S3Client()
                upload = multer({
                    storage: multerS3({
                        s3: s3,
                        bucket: el.connect.bucket,
                        acl: el.connect.acl || 'public-read',
                        contentDisposition: el.connect.contentDisposition || 'inline',
                        contentType: multerS3.AUTO_CONTENT_TYPE,
                        metadata: function (req, file, cb) {

                            cb(null, {fieldName: file.fieldname});
                        },
                        key: function (req, file, cb) {
                            let ext = file.originalname.split('.')
                            let folder = req?.folder ? (req.folder + '/') : ""
                            ext = ext[ext.length - 1]
                            if (el.structure_folder == 'date') {
                                cb(null, folder + moment().format('YYYY') + '/' + moment().format('MM') + '/' + moment().format('DD') + '/' + uuidv4() + '__' + file.originalname)
                            } else if (el.structure_folder == 'extension') {
                                cb(null, folder + ext.toUpperCase() + '/' + uuidv4() + '__' + file.originalname)
                            } else if (el.structure_folder == 'custom') {
                                cb(null, folder + el.custom_folder_name + '/' + uuidv4() + '__' + file.originalname)
                            } else if (el.structure_folder == 'alphabetic') {
                                let vo = file.originalname.split('')
                                vo = vo[0]
                                cb(null, folder + vo.toUpperCase() + '/' + uuidv4() + '__' + file.originalname)
                            } else {
                                let vo = file.originalname.split('')
                                vo = vo[0]
                                cb(null, folder + uuidv4() + '__' + file.originalname)
                            }

                        }
                    })
                })
            } else {

                const storage = multer.diskStorage({
                    destination: async function (req, file, cb) {

                        let ext = file.originalname.split('.')
                        ext = ext[ext.length - 1]
                        let folder = req?.folder ? (req.folder + '/') : ""


                        if (el.structure_folder == 'date') {
                            let path_ = await makeDir(el.path_folder + '/' + folder + moment().format('YYYY') + '/' + moment().format('MM') + '/' + moment().format('DD') + '/');
                            req.innerPath = req.protocol + '://' + req.get('host') + '/' + el.public_folder + '/' + folder + moment().format('YYYY') + '/' + moment().format('MM') + '/' + moment().format('DD') + '/'
                            cb(null, path_)
                        } else if (el.structure_folder == 'extension') {
                            let path_ = await makeDir(el.path_folder + '/' + folder + ext.toUpperCase() + '/');
                            req.innerPath = req.protocol + '://' + req.get('host') + '/' + el.public_folder + '/' + folder + ext.toUpperCase() + '/'
                            cb(null, path_)
                        } else if (el.structure_folder == 'custom') {
                            let path_ = await makeDir(el.path_folder + '/' + folder + el.custom_folder_name + '/');
                            req.innerPath = req.protocol + '://' + req.get('host') + '/' + el.public_folder + '/' + folder + el.custom_folder_name + '/'
                            cb(null, path_)
                        } else if (el.structure_folder == 'alphabetic') {
                            let vo = file.originalname.split('')
                            vo = vo[0]
                            let path_ = await makeDir(el.path_folder + '/' + folder + vo.toUpperCase() + '/');
                            req.innerPath = req.protocol + '://' + req.get('host') + '/' + el.public_folder + '/' + folder + vo.toUpperCase() + '/'
                            cb(null, path_)
                        } else {
                            let path_ = await makeDir(el.path_folder + '/' + folder);
                            req.innerPath = req.protocol + '://' + req.get('host') + '/' + el.public_folder + '/' + folder
                            cb(null, path_)
                        }
                    },
                    filename: function (req, file, cb) {

                        let ext = file.originalname.split('.')
                        ext = ext[ext.length - 1]
                        cb(null, uuidv4() + file.originalname)
                    }
                })


                upload = multer({
                    storage: storage,
                    limits: {fileSize: el.limits.fileSize}
                })

            }


            let middleware = async function (req, res, next) {

                if (!el.secure) {
                    next()
                    return
                }

                if (!el?.secure?.user || !el?.secure?.password) {
                    res.status(403).json({
                        success: true,
                        code: 403,
                        error: 'The user or password is not set',
                        message: '403 - Forbidden ',
                        container_id: await getId(),

                    })
                    return
                }


                if (!req?.headers?.authorization && !req?.query?.authorization) {
                    res.status(403).json({
                        success: true,
                        code: 403,
                        error: 'Token or header not present',
                        message: '403 - Forbidden ',
                        container_id: await getId(),
                    })
                    return
                }

                let auth = (req?.headers?.authorization?.replace('Basic ', '')) || (req?.query?.authorization?.replace('Basic ', ''))


                let decoded = el.decodeBase64(auth)


                if (decoded != (el.secure.user + ':' + el.secure.password)) {
                    res.status(403).json({
                        success: true,
                        code: 403,
                        error: 'Invalid Access or credentials',
                        message: '403 - Forbidden ',
                        container_id: await getId(),

                    })
                    return
                }

                next()
            }


            el.app.get('/', async function (_req, res) {
                res.status(200).json({
                    success: true,
                    code: 200,
                    error: '',
                    message: 'Tres comas (,,,) has been successful started',
                    container_id: await getId()
                })
            })

            el.app.post(el.api_base_uri + 'upload/array', upload.array('files', el.limits.filesArray || 10), middleware, async function (req, res) {

                try {
                    let response = []
                    let fUri = req.protocol + '://' + req.get('host')


                    for (let item of req.files) {
                        let token = uuidv4()


                        if (el.engine == "aws-s3") {
                            let newfile = {
                                url: item.location,
                                name: item.originalname,
                                extension: item.contentType,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                engine: 'aws-s3',
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        } else {
                            let newfile = {

                                name: item.originalname,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                extension: item.contentType,
                                url: (el.allow_public ? (req.innerPath + item.filename) : undefined),
                                engine: 'local',
                                allow_public: el.allow_public,
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        }

                    }


                    res.status(200).json({
                        success: true,
                        code: 200,
                        error: false,
                        message: 'Upload OK',
                        container_id: await getId(),
                        data: response
                    })
                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }


            })

            el.app.post(el.api_base_uri + 'upload/single', upload.single('file'), middleware, async function (req, res) {

                try {
                    let response = []
                    let fUri = req.protocol + '://' + req.get('host')

                    let files = req.file
                    for (let item of [files]) {
                        let token = uuidv4()


                        if (el.engine == "aws-s3") {
                            let newfile = {
                                url: item.location,
                                name: item.originalname,
                                extension: item.contentType,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                engine: 'aws-s3',
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        } else {
                            let newfile = {

                                name: item.originalname,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                extension: item.contentType,
                                url: (el.allow_public ? (req.innerPath + item.filename) : undefined),
                                engine: 'local',
                                allow_public: el.allow_public,
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        }

                    }


                    res.status(200).json({
                        success: true,
                        code: 200,
                        error: false,
                        message: 'Upload OK',
                        container_id: await getId(),
                        data: response
                    })
                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }


            })
            el.app.post(el.api_base_uri + 'upload/', upload.any(), middleware, async function (req, res) {

                try {
                    let response = []
                    let fUri = req.protocol + '://' + req.get('host')

                    for (let item of req.files) {
                        let token = uuidv4()


                        if (el.engine == "aws-s3") {
                            let newfile = {
                                url: item.location,
                                name: item.originalname,
                                extension: item.contentType,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                engine: 'aws-s3',
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        } else {
                            let newfile = {

                                name: item.originalname,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                extension: item.contentType,
                                url: (el.allow_public ? (req.innerPath + item.filename) : undefined),
                                engine: 'local',
                                allow_public: el.allow_public,
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        }

                    }


                    res.status(200).json({
                        success: true,
                        code: 200,
                        error: false,
                        message: 'Upload OK',
                        container_id: await getId(),
                        data: response
                    })
                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }


            })

            el.app.post(el.api_base_uri + 'upload/f/:folder/', upload.any(), middleware, async function (req, res) {

                try {
                    let response = []
                    let fUri = req.protocol + '://' + req.get('host')

                    for (let item of req.files) {
                        let token = uuidv4()


                        if (el.engine == "aws-s3") {
                            let newfile = {
                                url: item.location,
                                name: item.originalname,
                                extension: item.contentType,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                engine: 'aws-s3',
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        } else {
                            let newfile = {

                                name: item.originalname,
                                filename: item?.filename || '',
                                path: item?.path || '',
                                dest: item?.destination || '',
                                extension: item.contentType,
                                url: (el.allow_public ? (req.innerPath + item.filename) : undefined),
                                engine: 'local',
                                allow_public: el.allow_public,
                                token: token
                            }
                            let toSave = new el.filesModel(newfile)
                            toSave = await toSave.save()
                            let link = fUri + el.api_base_uri + 'view/' + toSave._id + '?token=' + token
                            toSave.link = link
                            toSave = await toSave.save()
                            response.push(toSave)
                        }

                    }


                    res.status(200).json({
                        success: true,
                        code: 200,
                        error: false,
                        message: 'Upload OK',
                        container_id: await getId(),
                        data: response
                    })
                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }


            })

            el.app.get(el.api_base_uri + 'view/:id', middleware, async function (req, res) {
                try {

                    let id = req?.params?.id
                    let token = req?.query?.token

                    let one = await el.filesModel.findOne({_id: id, token: token})

                    if (!one) {
                        res.status(403).json({
                            success: true,
                            code: 403,
                            error: 'Invalid Access or token',
                            message: '403 - Forbidden ',
                            container_id: await getId(),

                        })
                        return
                    }

                    if (one.engine == 'local') {
                        res.status(200).sendFile(path.join(one.path))
                        return
                    } else {
                        res.status(200).redirect(one.url)
                        return
                    }

                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }
            })

            el.app.get(el.api_base_uri + 'list', middleware, async function (req, res) {
                try {


                    let {where, like, paginate, sort} = req?.query

                    let find = {}
                    if (where) {
                        for (let [key, value] of Object.entries(where)) {
                            find[key] = value
                        }
                    }
                    if (like) {
                        for (let [key, value] of Object.entries(like)) {
                            find[key] = {$regex: value, $options: 'i'}
                        }
                    }
                    let one = el.filesModel.find(find)

                    let order = {}
                    if (sort) {
                        for (let [key, value] of Object.entries(sort)) {
                            order[key] = value
                        }
                    }
                    one.sort(order)

                    if (paginate && paginate.limit && paginate.page) {
                        one.skip(Number(paginate.limit) * Number(paginate.page))
                        one.limit(Number(paginate.limit))
                    }


                    one = await one.exec()

                    if (!one || one.length == 0) {
                        res.status(404).json({
                            success: false,
                            code: 404,
                            error: 'Archivos no encontrados',
                            message: '404 - Not- Found ',
                            container_id: await getId(),

                        })
                        return
                    }

                    res.status(200).json({
                        success: true,
                        code: 200,
                        data: one,
                        message: 'OK',
                        container_id: await getId(),

                    })
                    return


                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: e,
                        message: 'Upload Error',
                        container_id: await getId()
                    })
                }
            })

            el.app.post(el.api_base_uri + 'file/dt_agr', middleware, ms_.datatable_aggregate(el.filesModel, [], '', {allowDiskUse: true}))
            el.app.get(el.api_base_uri + 'file/one', middleware, ms_.getOneWhere(el.filesModel, false, {}))
            el.app.get(el.api_base_uri + 'file/:id', middleware, ms_.getOneById(el.filesModel, false, {}))
            el.app.get(el.api_base_uri + 'file/', middleware, ms_.getMany(el.filesModel, false, {}))

            el.app.put(el.api_base_uri + 'file/:id', middleware, ms_.updateById(el.filesModel, {}, false, {}))
            el.app.delete(el.api_base_uri + 'file/:id', middleware, ms_.findIdAndDelete(el.filesModel, {}))


        }

        this.addHooliLogger = async function (host = "http://localhost:3333", AppName = 'tres-comas') {
            let el = this
            let logger = new hooli(host, AppName, await getId() || 'API-REST')
            const _privateLog = console.log;
            const _privateError = console.error;
            const _privateInfo = console.info;
            const _privateWarn = console.warn;
            const _privateDebug = console.debug;

            console.log = async function (message) {
                _privateLog.apply(console, arguments);
                logger.log(arguments)
            };
            console.error = async function (message) {
                _privateError.apply(console, arguments);
                logger.error(arguments)
            };
            console.info = async function (message) {
                _privateInfo.apply(console, arguments);
                logger.info(arguments)
            };
            console.warn = async function (message) {
                _privateWarn.apply(console, arguments);
                logger.warn(arguments)
            };
            console.debug = async function (message) {
                _privateDebug.apply(console, arguments);
                logger.debug(arguments)
            };
            el.app.use(morgan(function (tokens, req, res) {
                /*  Implement request logger  */
                logger.request(JSON.stringify({
                    method: tokens.method(req, res),
                    url: tokens.url(req, res),
                    status: tokens.status(req, res),
                    body: req.body,
                    query: req.query,
                    params: req.params,
                }))
                return '';
            }));
        }
        this.publishServerStats = async function () {
            let el = this
            let {cpu, drive, osCmd, mem, netstat, os} = osu
            el.app.get(el.api_base_uri + 'STATS', async function (_req, res) {
                try {
                    let obj_counts = []

                    let drive_info,
                        drive_free,
                        drive_used = {}
                    try {
                        drive_info = await drive.info()
                        drive_free = await drive.free()
                        drive_used = await drive.used()
                    } catch (e) {
                        console.info('No hay disco ')
                    }

                    res.status(200).json({
                        success: true,
                        code: 200,
                        error: '',
                        message: 'Server statistics',
                        data: {
                            model_counts: obj_counts,
                            cpu_usage: await cpu.usage(),
                            cpu_average: await cpu.average(),
                            cpu_free: await cpu.free(),
                            cpu_count: await cpu.count(),
                            osCmd_whoami: await osCmd.whoami(),
                            drive_info,
                            drive_free,
                            drive_used,
                            mem_used: await mem.used(),
                            mem_free: await mem.free(),

                            netstat_inout: await netstat.inOut(),
                            os_info: await os.oos(),
                            os_uptime: await os.uptime(),
                            os_platform: await os.platform(),
                            os_ip: await os.ip(),
                            os_hostname: await os.hostname(),
                            os_arch: await os.arch(),
                        },
                        container_id: await getId()
                    })
                } catch (e) {
                    console.error(e)
                    res.status(500).json({
                        success: false,
                        code: 500,
                        error: 'Internal server error',
                        message: e.message,
                    })
                }
            })
        }
        this.getExpressInstanceApp = function () {
            return this.app
        }
        this.getMongooseInstanceApp = function () {
            return {
                mongooseInstance: this.mongoose,
                schema: {FILES: this.filesMSchema},
                model: {FILES: this.filesModel}
            }
        }
        this.start = async function () {
            this.app.get('*', async function (_req, res) {
                res.status(404).json({
                    success: false,
                    code: 404,
                    error: 'Resource not found',
                    message: 'Tres-Comas has been successful started',
                    container_id: await getId()
                })
            })
            if (ssl_config && ssl_config.private && ssl_config.cert && ssl_config.port) {
                this.httpsServer.listen(ssl_config.port, () => {
                    console.log("https server start al port", ssl_config.port);
                });
            }
            this.httpServer.listen(port ? port : 3000, () => {
                console.log("http server start al port", port ? port : 3000);
            });
            this.db.once("open", function () {
                console.log("MongoDB database connection established successfully", mongoDBUri);
            });
            return true
        }
        this.uploadFileS3 = async function (filePath, dest) {
            try {
                let el = this

                const s3Client = new S3Client({
                    credentials: {
                        accessKeyId: el.connect.aws_access_key_id,
                        secretAccessKey: el.connect.aws_secret_access_key,
                    },
                    region: el.connect.region
                });


                let file = fs.readFileSync(filePath)
                let parse = path.parse(filePath)
                let nameFile_file = parse.name
                let ext = parse.ext.replace('.', '')
                let params

                if (ext.includes('pdf')) {

                    params = {
                        Bucket: el.connect.bucket,
                        Key: dest,
                        Body: file,
                        ACL: 'public-read',
                        ContentType: 'application/pdf',
                        ContentDisposition: 'inline; filename=test.pdf',
                        ResponseContentDisposition: 'inline; filename=test.pdf',
                    }
                } else if (ext.includes('jpg') || ext.includes('jpeg') || ext.includes('png') || ext.includes('tiff') || ext.includes('webp') || ext.includes('bmp')) {

                    params = {
                        Bucket: el.connect.bucket,
                        Key: dest,
                        Body: file,
                        ACL: 'public-read',
                        ContentType: 'image/' + ext,
                        ContentDisposition: 'inline; filename=' + nameFile_file + '.' + ext,
                        ResponseContentDisposition: 'inline; filename=' + nameFile_file + '.' + ext,
                    }
                } else {
                    params = {
                        Bucket: el.connect.bucket,
                        Key: dest,
                        Body: file,
                        ACL: 'public-read',
                        ContentDisposition: 'inline'
                    }
                }

                const command = new PutObjectCommand(params);
                const response = await s3Client.send(command);

                return {
                    file: response,
                    url: `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`
                };
            } catch (e) {
                throw e
            }
        }
    } catch (e) {
        console.error(e)
        throw e
    }
}
module.exports = tresComas
