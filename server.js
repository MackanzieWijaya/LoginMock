require('dotenv').config();


const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const Database = require("better-sqlite3");
const fs = require("fs"); 

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!fs.existsSync("./database")) {
    fs.mkdirSync("./database");
}

// THEN create DB
const db = new Database("./database/users.db");

const db = new Database("./database/users.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)
`).run();


// db injection
const users = [
    ["admin","test123"],
    ["student1","pass123"],
    ["student2","pass456"],
    ["guest","guest123"]
];

for(const [username,password] of users){

    const hashedPassword =
        bcrypt.hashSync(password,10);

    try{

        db.prepare(`
            INSERT INTO users(username,password)
            VALUES (?,?)
        `).run(username,hashedPassword);

    }catch(err){
        console.log(`${username} already exists`);
    }
}

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite:"strict"
    }
}));

app.use(express.static(path.join(__dirname, "Public")));




// LOGIN ROUTE
app.post("/api/login", async (req,res)=>{

    const {username,password,authType} = req.body;

    const user = db.prepare(`
        SELECT * FROM users
        WHERE username = ?
    `).get(username);

    if(!user){
        return res.status(401).json({
            message:"User not found"
        });
    }

    const validPassword = await bcrypt.compare(
        password,
        user.password
    );

    if(!validPassword){
        return res.status(401).json({
            message:"Wrong password"
        });
    }

    // JWT AUTH
    if(authType==="jwt"){

        const token = jwt.sign(
            {
                id:user.id,
                username:user.username
            },
            JWT_SECRET,
            {expiresIn:"1h"}
        );

        return res.json({
            token
        });
    }

    // COOKIE AUTH
    else{

        req.session.user={
            id:user.id,
            username:user.username
        };

        return res.json({
            message:"Cookie session created"
        });
    }

});


// PROTECTED ROUTE
app.get("/api/protected-route",(req,res)=>{

    const authHeader=req.headers.authorization;

    // JWT check
    if(authHeader){

        const token=authHeader.split(" ")[1];

        try{

            const decoded=
                jwt.verify(token,JWT_SECRET);

            return res.json({
                message:`Hello ${decoded.username}`
            });

        }catch{

            return res.sendStatus(401);
        }
    }

    // Cookie check
    if(req.session.user){

        return res.json({
            message:`Hello ${req.session.user.username}`
        });

    }

    res.sendStatus(401);

});


app.post("/api/logout",(req,res)=>{

    req.session.destroy((err)=>{

        if(err){
            return res.status(500).json({
                message:"Logout failed"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message:"Logged out"
        });

    });

});


app.get("/api/profile",(req,res)=>{

    if(req.session.user){
        return res.json(req.session.user);
    }

    const authHeader=req.headers.authorization;

    if(authHeader){

        try{

            const token=
                authHeader.split(" ")[1];

            const decoded=
                jwt.verify(token,JWT_SECRET);

            return res.json(decoded);

        }catch{}
    }

    res.sendStatus(401);

});


app.get("/api/auth-debug",(req,res)=>{

    const authHeader = req.headers.authorization;

    res.json({
        sessionUser: req.session.user || null,
        authorizationHeader: authHeader || null,
        cookies: req.cookies
    });

});


app.listen(PORT,()=>{
    console.log(
        `Server running on port ${PORT}`
    );
});