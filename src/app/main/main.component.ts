import {
  Component,
  ComponentFactory,
  ComponentFactoryResolver,
  ComponentRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { User } from 'src/app/_models/user';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ImagepostComponent } from './imagepost/imagepost.component';
import { TextpostComponent } from './textpost/textpost.component';
import { UserComponent } from './user/user.component';
import { MainService } from './main.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css'],
  providers: [ ImagepostComponent, TextpostComponent, UserComponent ]
})
export class MainComponent implements OnInit, OnDestroy {
  @ViewChild('postContainer', { read: ViewContainerRef }) postContainer;
  @ViewChild('userContainer', { read: ViewContainerRef }) userContainer;
  currentUser: User;
  users: User[] = [];
  footer: SafeHtml;
  content: string[] = [];
  image: string[] = [];
  searchText = '';
  addText = '';
  posts = [];
  post1Ref: ComponentRef<ImagepostComponent>;
  post2Ref: ComponentRef<TextpostComponent>;
  userRef: ComponentRef<UserComponent>;
  cleared = true;
  adding = false;
  lastFollowed = '';
  addSuccess = false;
  addMyself = false;
  addFailure = false;
  addAlreadyFollowing = false;

  constructor(
    private sanitizer: DomSanitizer,
    private resolver: ComponentFactoryResolver,
    private service: MainService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const text = '@Copyright: Rylie Gao<br/>' + new Date(Number(Date.now()));
    this.footer = this.sanitizer.bypassSecurityTrustHtml(text);
  }

  ngOnInit() {
    this.loadUsers();
    this.loadPosts();
  }

  addFollowee() {
    this.addSuccess = false;
    this.addFailure = false;
    this.addMyself = false;
    this.addAlreadyFollowing = false;
    this.adding = true;
    if (this.addText === this.currentUser.username) {
      this.addMyself = true;
      return;
    } else if (this.service.followInfo.following.indexOf(this.addText) >= 0) {
      this.addAlreadyFollowing = true;
      return;
    }
    this.lastFollowed = this.addText;
    this.service.addFollowee(this.addText).then(
      newFollowee => {
        if (newFollowee) {
          this.addSuccess = true;
          this.addUser(newFollowee.name, newFollowee.avatar, newFollowee.status, false, 0);
          this.loadPosts();
        } else {
          this.addFailure = true;
        }
      }
    );
  }

  loadUsers() {
    this.service.loadUsers(this.currentUser.username).then(
      data => {
        for (let i = 0; i < data.following.length; i++) {
          this.service.getFolloweeInfo(data.following[i]).then(
            followee => {
              if (followee) {
                this.addUser(followee.name, followee.avatar, followee.status, i === 0);
              }
            }
          );
        }
      }
    );
  }

  loadPosts() {
    this.service.loadPosts().then(
      data => {
        this.posts = data;
        for (let i = 0; i < data.length; i++) {
          // only clear former posts on entry
          this.createPost(data[i].content, data[i].image, i === 0);
        }
      }
    );
  }

  search() {
    if (this.searchText === null || this.searchText === '') {
      if (!this.cleared) {
        this.cleared = true;
        this.loadPosts();
      }
      return;
    }
    this.cleared = false;
    let found = false;
    for (let i = 0; i < this.posts.length; i++) {
      const str = this.posts[i].content as string;
      if (str.toLowerCase().indexOf(this.searchText.toLowerCase()) >= 0) {
        this.createPost(this.posts[i].content, this.posts[i].image, !found);
        found = true;
      }
    }
    if (!found) {
      this.postContainer.clear();
    }
  }

  createPost(content: string, image: string, clear: boolean, index = this.postContainer.length) {
    if (clear) {
      this.postContainer.clear();
      index = 0;
    }

    const factory: ComponentFactory<ImagepostComponent> = this.resolver.resolveComponentFactory(ImagepostComponent);
    this.post1Ref = this.postContainer.createComponent(factory, index);
    this.post1Ref.instance.content = content;
    this.post1Ref.instance.image = image;
  }

  addUser(username: string, avatar: string, status: string, clear: boolean, index = this.userContainer.length) {
    if (clear) {
      this.userContainer.clear();
    }
    const factory: ComponentFactory<UserComponent> = this.resolver.resolveComponentFactory(UserComponent);
    this.userRef = this.userContainer.createComponent(factory, index);
    this.userRef.instance.username = username;
    this.userRef.instance.avatar = avatar;
    this.userRef.instance.status = status;
  }

  changeStatus(status: string) {
  //   try {
  //     if (localStorage.getItem('currentUser')) {
  //       const user: User = JSON.parse(localStorage.getItem('currentUser'));
  //       const newUser = {
  //         username: user.username,
  //         displayname: user.displayname,
  //         email: user.email,
  //         phone: user.phone,
  //         birthday: user.birthday,
  //         zipcode: user.zipcode,
  //         password: user.password,
  //         loggedin: user.loggedin,
  //         avatar: user.avatar,
  //         status
  //       };
  //       this.authService.makeNewUser(newUser);
  //     } else {
  //       this.authService.makeNewUser({ status });
  //     }
  //   } catch (e) {
  //     console.log('This browser does not support local storage.');
  //   }
  }

  ngOnDestroy() {
    if (this.post1Ref) {
      this.post1Ref.destroy();
    }
    if (this.post2Ref) {
      this.post2Ref.destroy();
    }
  }


  // deleteUser(id: number) {
  //   this.userService.delete(id).pipe(first()).subscribe(() => {
  //     this.loadAllUsers();
  //   });
  // }
  //
  // private loadAllUsers() {
  //   this.userService.getAll().pipe(first()).subscribe(users => {
  //     this.users = users;
  //   });
  // }
}
