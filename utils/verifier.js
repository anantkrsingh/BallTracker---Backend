const jwt = require("jsonwebtoken");

const verifyToken = (token) => {
  try {
    const secret = process.env.APP_SHA;
    const decoded = jwt.verify(token, secret);
    console.log(decoded.token);
    return decoded?.token;
  } catch (error) {
    console.log(error);
    throw new Error("Invalid token");
  }
};

module.exports = { verifyToken };
