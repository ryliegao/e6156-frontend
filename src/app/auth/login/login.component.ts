import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/auth.service';
import { StorageService } from 'src/app/_services';
import { AuthGuard } from 'src/app/_guards';

declare var window: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['../auth.component.css', './login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  submitted = false;
  invalid = false;
  notMatch = false;
  FB: any;
  errorMsg: string;
  @Output() loginEmitter = new EventEmitter();

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private storageService: StorageService,
    private authGuard: AuthGuard
  ) {}

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  }

  removeMsg() {
    this.invalid = false;
    this.notMatch = false;
    this.submitted = false;
  }

  logInWithFB() {
    this.authGuard.submitLogin();
  }

  onSubmit() {
    this.invalid = false;
    this.notMatch = false;
    this.submitted = true;

    const email = this.loginForm.get('email').value;
    const password = this.loginForm.get('password').value;

    // check if the input fields are filled
    if (this.loginForm.invalid) {
      this.invalid = true;
      return;
    }

    localStorage.removeItem('FBLoggedIn');

    // check if the email and password match
    this.authService.checkLogin(
      email, password
    ).then(match => {
      if (match === true) {
        this.storageService.waitForUserLogin().then(() => {
          this.router.navigate(['/main']).then(() => {
            return this.authService.getProfile(email);
          });
        });
      } else {
        if (match === 403) {
          this.errorMsg = "Please activate your account first!";
        } else {
          this.errorMsg = "E-mail address and password do not match!";
        }
        this.notMatch = true;
      }
    });
  }
}
