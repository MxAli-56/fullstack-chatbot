const jwt = require("jsonwebtoken")

function authMiddleware(req, res, next){
    const authHeader = req.headers["authorization"]

    const token = authHeader && authHeader.split(" ")[1]

    if(!token){
        return res.status(401).json({message: "No token... Access denied!"})
    }

try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.user = decoded

    next()
} catch (error) {
    return res.status(401).json({message: "Invalid or expired token"})
}
}

module.exports = authMiddleware;