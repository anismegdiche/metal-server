/* eslint-disable class-methods-use-this */
/* eslint-disable object-curly-spacing */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
//
//
//
//
//

class MetalClient {

    Params = {
        RestApiUrl: "http://localhost:3000",
        Username: undefined,
        Password: undefined,
        Authentication: false
    };

    Token = undefined;

    constructor({ RestApiUrl, Username = undefined, Password = undefined }) {
        this.Request = require("axios");
        this.API = {
            user: "/user",
            server: "/server",
            schema: "/schema",
            plan: "/plan",
            cache: "/cache"
        };
        this.Params.RestApiUrl = RestApiUrl;
        if (Username !== undefined && Password !== undefined) {
            this.Params.Authentication = true;
            this.UserLogin(Username, Password);
        }
    }

    //
    //  ### PRIVATE ###
    //

    _callbackSuccess(response) {
        return {
            status: response.status,
            data: response.data
        };
    }

    _callbackFailed(error) {
        if (error?.response?.data?.result === "error") {
            console.log(JSON.stringify(error?.response?.data));
        }
        return error?.response?.data;
    }

    _convertToParams(jsonObj) {
        const params = [];

        for (const [key, value] of Object.entries(jsonObj)) {
            if (value !== undefined && value !== null) {
                params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
            }
        }

        return params.join('&');
    }

    async _methodPost(url, body = null) {
        try {
            const response = await this.Request.post(url, body, this._setHeaders());
            return this._callbackSuccess(response);
        } catch (error) {
            return this._callbackFailed(error);
        }

    }

    async _methodGet(url) {
        try {
            const response = await this.Request.get(url, this._setHeaders());
            return this._callbackSuccess(response);
        } catch (error) {
            return this._callbackFailed(error);
        }
    }

    async _methodPatch(url, body = null) {
        try {
            const response = await this.Request.patch(url, body, this._setHeaders());
            return this._callbackSuccess(response);
        } catch (error) {
            return this._callbackFailed(error);
        }
    }


    async _methodDelete(url, body = null) {
        try {
            const response = await this.Request.delete(url, {
                headers: this._setHeaders().headers,
                data: body
            });
            return this._callbackSuccess(response);
        } catch (error) {
            return this._callbackFailed(error);
        }
    }


    _setHeaders() {
        let _headers = { 'Content-Type': 'application/json' };
        if (this.Token !== undefined) {
            _headers = {
                ..._headers,
                'Authorization': `Bearer ${this.Token}`
            };
        }
        return { headers: _headers };
    }

    //
    //  User
    //

    async UserLogin(username, password) {
        this.Params.Username = username;
        this.Params.Password = password;
        const response = await this._methodPost(`${this.Params.RestApiUrl}${this.API.user}/login`, {
            username,
            password
        });
        if (!response?.data?.token) {
            throw new Error('Token not found in response');
        }
        const { token } = response.data;
        this.Token = token;
    }

    //
    //  Data
    //

    async DataInsert(schema, entity, options) {
        return await this._methodPost(
            `${this.Params.RestApiUrl}${this.API.schema}/${schema}/${entity}`,
            options
        );
    }

    async DataSelect(schema, entity, options) {
        return await this._methodGet(
            `${this.Params.RestApiUrl}${this.API.schema}/${schema}/${entity}?${this._convertToParams(options)}`
        );
    }

    async DataUpdate(schema, entity, options) {
        return await this._methodPatch(
            `${this.Params.RestApiUrl}${this.API.schema}/${schema}/${entity}`,
            options
        );
    }

    async DataDelete(schema, entity, options) {
        return await this._methodDelete(
            `${this.Params.RestApiUrl}${this.API.schema}/${schema}/${entity}`,
            options
        );
    }

    //
    //  Cache
    //

    CachePurge() {
        return this._methodPost(`${this.Params.RestApiUrl}${this.API.cache}/purge`);
    }

    CacheClean() {
        return this._methodPost(`${this.Params.RestApiUrl}${this.API.cache}/clean`);
    }

    CacheView() {
        return this._methodGet(`${this.Params.RestApiUrl}${this.API.cache}/view`);
    }
}

module.exports = MetalClient;