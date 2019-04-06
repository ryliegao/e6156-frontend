import { EventEmitter, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { User } from 'src/app/_models/user';
import { AuthService } from 'src/app/auth/auth.service';
import { GlobalService } from 'src/app/_services';

export interface FollowInfo {
  followers: Array<string>;
  following: Array<string>;
}

export interface FolloweeInfo {
  username: string;
  displayname: string;
  status: string;
  avatar: string;
}

export interface Post {
  author: string;
  id: number;
  content: string;
  image: string;
  comments: Array<object>;
  date: string;
}

export interface Comment {
  commenter: string;
  content: string;
}

interface Response {
  articles: Array<Post>;
}

@Injectable({
  providedIn: 'root'
})
export class MainService {
  username: string;
  followInfo: FollowInfo;
  onRemove: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private httpService: HttpClient,
    private authService: AuthService,
    private globalService: GlobalService
  ) { }

  loadUsers(username: string): Promise<FollowInfo> {
    this.username = username;
    return this.httpService.get('assets/following.json').toPromise().then(
      data => {
        let followers = [];
        let following = [];
        if (data[username]) {
          followers = data[username].followers;
          following = data[username].following;
        }
        this.followInfo = { followers, following };
        return { followers, following };
      },
      (err: HttpErrorResponse) => {
        console.log(err.message);
        this.followInfo = { followers: [], following: [] };
        return { followers: [], following: [] };
      }
    );
  }

  getFolloweeInfo(followee: string): Promise<FolloweeInfo> {
    return this.httpService.get('assets/profile.json').toPromise().then(
      userinfo => {
        if (userinfo[followee]) {
          return {
            username: userinfo[followee].username,
            displayname: userinfo[followee].displayname ? userinfo[followee].displayname : userinfo[followee].username,
            status: userinfo[followee].status,
            avatar: userinfo[followee].avatar,
          };
        } else {
          return null;
        }
      },
      (err: HttpErrorResponse) => {
        console.log (err.message);
        return null;
      }
    );
  }

  loadPosts(): Promise<Array<Post>> {
    const request = this.httpService.post<Response>(
      this.globalService.serverURL + '/articles',
      this.globalService.options
    );
    return request.toPromise().then(res => {
        // const followeePosts = [];
        // if (posts[this.username]) {
        //   followeePosts.push.apply(followeePosts, posts[this.username]);
        // }
        //
        // for (const followee of this.followInfo.following) {
        //   if (posts[followee]) {
        //     followeePosts.push.apply(followeePosts, posts[followee]);
        //   }
        // }
        return this.sortPosts(res.articles);
      }
    );
  }

  private sortPosts(posts: Array<Post>) {
    posts.sort((a, b) => new Date(b.date).valueOf() - new Date(a.date).valueOf());
    return posts;
  }

  addFollowee(username: string): Promise<FolloweeInfo> {
    return this.httpService.get('assets/profile.json').toPromise().then(
      userinfo => {
        if (userinfo[username]) {
          this.followInfo.following.push(userinfo[username].username);
          // write to server side file
          // add this user to followee's followers' list
          return {
            username: userinfo[username].username,
            displayname: userinfo[username].displayname ? userinfo[username].displayname : userinfo[username].username,
            status: userinfo[username].status,
            avatar: userinfo[username].avatar,
          };
        } else {
          return null;
        }
      },
      (err: HttpErrorResponse) => {
        console.log (err.message);
        return null;
      }
    );
  }

  removeFollowee(username: string) {
    for (let i = 0; i < this.followInfo.following.length; i++) {
      if (this.followInfo.following[i] === username) {
        this.followInfo.following.splice(i, 1);
      }
    }
    this.onRemove.emit();

    // write to server side file
    // remove this user from followee's followers' list
  }

  changeStatus(status: string) {
    try {
      if (localStorage.getItem('currentUser')) {
        const user: User = JSON.parse(localStorage.getItem('currentUser'));
        const newUser = {
          username: user.username,
          displayname: user.displayname,
          email: user.email,
          phone: user.phone,
          birthday: user.birthday,
          zipcode: user.zipcode,
          password: user.password,
          loggedin: user.loggedin,
          avatar: user.avatar,
          status
        };
        this.authService.makeNewUser(newUser);
      }
    } catch (e) {
      console.log('This browser does not support local storage.');
    }
  }

  loadComments(author: string, id: number): Promise<Array<Comment>> {
    return this.httpService.get('assets/posts.json').toPromise().then(
      data => {
        let comments = [];
        if (data[author]) {
          for (const post of data[author]) {
            if (post.id === id) {
              comments = post.comments;
              break;
            }
          }
        }
        return comments;
      }
    );
  }
}
