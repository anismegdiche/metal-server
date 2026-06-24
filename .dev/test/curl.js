/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
import axios from 'axios'

const users = ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10', 'user11', 'user12', 'user13', 'user14', 'user15']
const password = 'pass'
const loginUrl = 'http://localhost:3000/user/login'
const getUrl = 'http://localhost:3000/schema/etl1/aitest'

async function loginUser(username) {
    try {
        const response = await axios.post(loginUrl, {
            username: username,
            password: password
        })
        return response.data.token
    } catch (error) {
        console.error(`Error logging in user ${username}:`, error.response
            ? error.response.data
            : error.message)
        return null
    }
}

async function getData(token) {
    try {
        const response = await axios.get(getUrl, {
            params: {
                fields: "img_to_text"
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        // console.log(response.data)
        console.log("User: ", token)
    } catch (error) {
        console.error('Error fetching data:', error.response
            ? error.response.data
            : error.message)
    }
}

async function main() {
    for (const user of users) {
        const token = await loginUser(user)
        if (token) {
            getData(token)
        }
    }
}

main()
