import jwt from 'jsonwebtoken'

const generateToken = (id) => {
    return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '7d'
    })
}

export default generateToken
