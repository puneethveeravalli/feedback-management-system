const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Optional Authentication Middleware
|--------------------------------------------------------------------------
|
| Unlike the normal authMiddleware, this middleware does NOT reject
| unauthenticated requests.
|
| Why?
|
| GROUP access credentials are allowed to work without login.
|
| However, PARTICIPANT credentials need to know who is attempting
| to access the feedback.
|
| Therefore:
|
|   Logged in participant
|        -> req.user is available
|
|   Not logged in
|        -> req.user = null
|
| The access credential controller decides whether login is required
| based on the credential scope.
|--------------------------------------------------------------------------
*/

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    const token =
      authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    /*
     * No token is perfectly valid here.
     *
     * This is necessary for GROUP public access.
     */
    if (!token) {
      req.user = null;
      return next();
    }

    /*
     * Verify JWT.
     */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /*
     * Load the current user from database.
     */
    const user = await User.findById(
      decoded.userId
    );

    /*
     * Invalid/inactive user should simply be treated
     * as unauthenticated.
     *
     * We don't immediately reject because GROUP
     * public access can still work.
     */
    if (
      !user ||
      user.status !== "ACTIVE"
    ) {
      req.user = null;
      return next();
    }

    /*
     * Make authenticated user available
     * to the controller.
     */
    req.user = user;

    return next();
  } catch (error) {
    /*
     * Invalid/expired token should not break
     * public GROUP access.
     *
     * The controller will decide whether authentication
     * is mandatory for the particular credential.
     */
    req.user = null;

    return next();
  }
};

module.exports = optionalAuth;