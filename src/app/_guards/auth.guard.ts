﻿import { Injectable, NgZone } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { User } from 'src/app/_models/user';
import { StorageService } from 'src/app/_services';
import { AuthService } from "src/app/auth/auth.service";

declare let FB: any;

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private storageService: StorageService,
    private ngZone: NgZone,
    private authService: AuthService,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    (window as any).fbAsyncInit = () => {
      FB.init({
        appId      : '2289672608026531',
        cookie     : true,  // enable cookies to allow the server to access the session
        xfbml      : true,  // parse social plugins on this page
        version    : 'v3.2' // The Graph API version to use for the call
      });

      // Now that we've initialized the JavaScript SDK, we call
      // FB.getLoginStatus().  This function gets the state of the
      // person visiting this page and can return one of three states to
      // the callback you provide.  They can be:
      //
      // 1. Logged into your app ('connected')
      // 2. Logged into Facebook, but not your app ('not_authorized')
      // 3. Not logged into Facebook and can't tell if they are logged into
      //    your app or not.
      //
      // These three cases are handled in the callback function.

      FB.Event.subscribe('auth.statusChange', (response => {
        if (response.status === 'connected') {
          // use the response variable to get any information about the user and
          // to see the tokens about the users session
          localStorage.setItem('FBLoggedIn', 'true');
          this.router.navigate(['/main']);
        } else {
          localStorage.setItem('FBLoggedIn', 'false');
          this.router.navigate(['/auth/login']);
        }
      }));
    };

    ((d, s, id) => {
      let js;
      const fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {
        return;
      }
      js = d.createElement(s);
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      fjs.parentNode.insertBefore(js, fjs);
    }) (document, 'script', 'facebook-jssdk');
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    try {
      if (!localStorage.getItem('currentUser')) {
        // return false if localStorage is available but user has not registered
        if (localStorage.getItem('FBLoggedIn') === 'true') {
          console.log('can activate');
          return true;
        } else {
          this.router.navigate(['/auth/register']); // redirect to register page
          return false;
        }
      } else {
        const user: User = JSON.parse(localStorage.getItem('currentUser'));
        this.storageService.setItem('currentUser');
        if (!user.loggedin) {
          // if user has registered but not logged in, redirect to login page
          this.router.navigate(['/auth/login']);
        }
        return user.loggedin;
      }
    } catch (e) {
      console.log('This browser does not support local storage.');
      return true;
    }
  }

  retrieveUserInfo(response: {status: string, authResponse: {accessToken: string}}) {
    localStorage.setItem('FBLoggedIn', 'true');
    FB.api('/me?access_token=' + response.authResponse.accessToken, {
      fields: 'last_name,first_name,email'
    }, response => {
      const user = {
        lastname: response.last_name,
        firstname: response.first_name,
        email: response.email,
        password: null,
        loggedin: true,
        status: null,
        avatar: response.profile_pic
      };
      this.authService.makeNewUser(user);

      this.authService.storeToken(response.email);
      this.ngZone.run(() => this.router.navigate(['/main'])).then();
    });
  }

  submitLogin() {
    return FB.getLoginStatus(response => {
      if (response.status !== 'connected') {
        FB.login(response => {
          this.retrieveUserInfo(response);
        });
      } else {
        this.retrieveUserInfo(response);
      }
    },
      {scope: 'email,public_profile,manage_pages,pages_show_list'}
      );
  }

  submitLogout() {
    return FB.getLoginStatus(response => {
      if (response.status === 'connected') {
        return FB.logout(res => {
          FB.Auth.setAuthResponse(null, 'unknown');
          FB.api('/me/permissions', 'DELETE');
          localStorage.removeItem('FBLoggedIn');
        });
      }
    });
  }
}
