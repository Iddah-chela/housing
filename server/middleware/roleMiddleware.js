// Middleware to require admin role
export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    
    next();
};

// Middleware to require house owner role
export const requireOwner = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    if (req.user.role !== 'houseOwner' && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. House owner privileges required.'
        });
    }
    
    next();
};
