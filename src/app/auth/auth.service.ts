import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import { User } from 'src/app/_models/user';
import { StorageService, GlobalService } from 'src/app/_services';
import {log} from "util";
import { stringify } from 'querystring';

interface LoginResponse {
  username: string;
  result: boolean;
}

interface profileResponse {
  username: string;
  result: boolean;
}


interface NameResponse {
  username: string;
  displaynames: Array<{username: string, displayname: string}>;
}

interface UserResponse {
  last_name: string;
  first_name: string;
  email: string;
  status: string;
  password: string;
  avatar: string;
}

interface EmailResponse {
  username: string;
  email: string;
}

interface PhoneResponse {
  username: string;
  phone: string;
}

interface DobResponse {
  username: string;
  dob: string;
}

interface ZipCodeResponse {
  username: string;
  zipcode: string;
}

interface StatusResponse {
  username: string;
  headlines: Array<{username: string, headline: string}>;
}

interface AvatarResponse {
  username: string;
  avatars: Array<{username: string, avatar: string}>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private httpService: HttpClient,
    private storageService: StorageService,
    private globalService: GlobalService
  ) { }

  static checkUnderage(birthday: Date) {
    const today = new Date(Date.now());
    const year = today.getFullYear() - birthday.getFullYear();
    const month = today.getMonth() - birthday.getMonth();
    const day = today.getDate() - birthday.getDate() - 1; // Do not use getDay()
    if (year < 18 || (year === 18 && month < 0) || (year === 18 && month === 0 && day < 0)) {
      alert('Sorry, you are underage!\n\nOnly individuals 18 years of age ' +
        'or older on the day of registration are allowed to register');
      return false;
    }
    return true;
  }

  static checkPasswordEquality(pswd1, pswd2) {
    if (pswd1 !== pswd2) {
      alert('ERROR: The passwords you entered do not match.');
      return false;
    }
    return true;
  }

  makeNewUser(obj) {
    try {
      const user = new User(obj);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.storageService.setItem('New user stored!');
    } catch (e) {
      console.log('This browser does not support local storage.');
    }
  }

  storeToken(token: string) {
    sessionStorage.setItem('session_id', token);
  }

  retrieveToken(): string {
    return sessionStorage.getItem('session_id') || '';
  }

  checkLogin(username: string, password: string): Promise<boolean | number> {
    const body = { username, password };
    const user = { lastname: null, firstname: null, email: username, password: null,
      loggedin: true, status: null, avatar: null };
    const request = this.httpService.post<LoginResponse>(
      this.globalService.serverURL + '/api/user/login',
      body,
      { observe: "response" }
    );

    return request.toPromise().then(login => {
      this.storeToken(login.headers.get('Token'));
      return this.httpService.get<UserResponse>(
        this.globalService.serverURL + '/api/user/' + username,
        {
          headers: new HttpHeaders()
            .set('Token', this.retrieveToken())
        }).toPromise().then(userRsp => {
        user.lastname = userRsp.last_name;
        user.firstname = userRsp.first_name;
        user.password = userRsp.password;
        user.status = userRsp.status; // TODO: this is not the status we want
        user.avatar = userRsp.avatar;
        this.makeNewUser(user);
        return login.body.result;
      });
    }).then(res => {
      return res;
    }).catch((err: HttpErrorResponse) => {
      return err.status;
    });
  }

  registerUser(user: User) {
    const body = {
      last_name: user.lastname,
      first_name: user.firstname,
      email: user.email,
      password: user.password
    };
    const request = this.httpService.post<LoginResponse>(
      this.globalService.serverURL + '/api/user/registration',
      body,
      this.globalService.options
    );

    return request.toPromise().then(res => {
      // return res.result && res.result === 'success';
      return true;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
    });
  }

  updateDisplayName(displayname: string) {
    const request = this.httpService.put<NameResponse>(
      this.globalService.serverURL + '/displayname',
      { displayname },
      this.globalService.options
    );

    return request.toPromise().then(res => {
      return res.displaynames;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
      return '';
    });
  }

  updateEmail(email: string) {
    const request = this.httpService.put<EmailResponse>(
      this.globalService.serverURL + '/email',
      { email },
      this.globalService.options
    );

    return request.toPromise().then(res => {
      return res.email;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
      return '';
    });
  }

  updatePhone(phone: string) {
    const request = this.httpService.put<PhoneResponse>(
      this.globalService.serverURL + '/phone',
      { phone },
      this.globalService.options
    );

    return request.toPromise().then(res => {
      return res.phone;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
      return '';
    });
  }

  updateZipCode(zipcode: string) {
    const request = this.httpService.put<ZipCodeResponse>(
      this.globalService.serverURL + '/zipcode',
      { zipcode },
      this.globalService.options
    );

    return request.toPromise().then(res => {
      return res.zipcode;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
      return '';
    });
  }

  updateAvatar(avatar: string) {
    const request = this.httpService.put<{avatar: string}>(
      this.globalService.serverURL + '/avatar',
      { avatar },
      this.globalService.options
    );

    return request.toPromise().then(res => {
      return res.avatar;
    }).catch((err: HttpErrorResponse) => {
      console.log(err.message);
      return '';
    });
  }
  /////////////////////////////////////

  checkprofile(email: string) {
    const request = this.httpService.get<profileResponse>(
      this.globalService.serverURL + '/api/profile/' + email,
      { headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Token', sessionStorage.getItem('session_id') || ''),
        observe: "response" }
      );

    return request.toPromise().then(profile => {
      sessionStorage.setItem('Etag',(profile.headers.get('ETag')));
      return true;
    }).catch((err: HttpErrorResponse) => {
      return false;
    });
  }

  async getProfile(email: string) {
    const request = this.httpService.get<profileResponse>(
      this.globalService.serverURL + '/api/profile/' + email,
      { headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Token', sessionStorage.getItem('session_id') || ''),
        observe: "response" }
      );
    return request.toPromise().then(profile => {
      console.log(profile.body)
      return profile.body;
    }).catch((err: HttpErrorResponse) => {
      return false;
    });
  }


  updateprofile1(dn:string,hpn:string, mpn:string, adrs1:string,adrs2:string,email:string){
    const body = {"display_name":dn,"address_line_1":adrs1,
    "address_line_2":adrs2,"home_phone":hpn,"work_phone":mpn}
    const request = this.httpService.put(
      this.globalService.serverURL + '/api/profile/' + email,
      body,
      { headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Token', sessionStorage.getItem('session_id') || '')
        .set('If-Match', sessionStorage.getItem('Etag') || ''),
        observe: "response" }
      );
      return request.toPromise().then(profile => {
        console.log(profile.headers)
      }).catch((err: HttpErrorResponse) => {
        console.log(err.message);
      });
  }

  updateprofile2(dn:string,hpn:string, mpn:string, adrs1:string,adrs2:string,email:string){
    const body = {"display_name":dn,"address_line_1":adrs1,
    "address_line_2":adrs2,"home_phone":hpn,"work_phone":mpn,"email":email}
    const request = this.httpService.post(
      this.globalService.serverURL + '/api/profile',
      body,
      { headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Token', sessionStorage.getItem('session_id') || '')
        .set('Etag', sessionStorage.getItem('Etag') || ''),
        observe: "response" }
      );
      return request.toPromise().then(profile => {
        console.log(profile)
      }).catch((err: HttpErrorResponse) => {
        console.log(err.message);
      });
  }

}
