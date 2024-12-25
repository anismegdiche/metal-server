import axios from 'axios'

describe('SOAP E2E Tests', () => {
    // eslint-disable-next-line init-declarations
    let token: string

    beforeAll(async () => {
        // Login and get the token
        const loginResponse = await axios.post('http://localhost:3000/user/login', {
            username: 'myapiuser',
            password: 'myStr@ngpa$$w0rd'
        })

        expect(loginResponse.status).toBe(200)
        expect(loginResponse.data).toHaveProperty('token')

        token = loginResponse.data.token
    })

    it('should fetch movies with valid token', async () => {
        const readResponse = await axios.get('http://localhost:3000/schema/soap/movies', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        expect(readResponse.status).toBe(200)
        expect(readResponse.data).toBeDefined()

        // Add additional assertions based on the expected response structure
    })
})
