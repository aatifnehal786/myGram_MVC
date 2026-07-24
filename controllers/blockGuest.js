const blockGuest = (req, res, next) => {

    if (req.user?.isGuest) {
        return res.status(403).json({
            success: false,
            message: "Guest users cannot perform this action. Please sign up or log in.",
        });
    }

    next();
};

export { blockGuest };