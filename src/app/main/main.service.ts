import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

export interface FollowInfo {
  followers: Array<string>;
  following: Array<string>;
}

export interface FolloweeInfo {
  name: string;
  status: string;
  avatar: string;
}

export interface Post {
  content: string;
  image: string;
  comments: Array<object>;
}

@Injectable({
  providedIn: 'root'
})
export class MainService {
  followInfo: FollowInfo;

  constructor(private httpService: HttpClient) { }

  loadUsers(username: string): Promise<FollowInfo> {
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
        console.log (err.message);
        this.followInfo = { followers: [], following: [] };
        return { followers: [], following: [] };
      }
    );
  }

  getFollowingUsersInfo(followee: string): Promise<FolloweeInfo> {
    return this.httpService.get('assets/profile.json').toPromise().then(
      userinfo => {
        if (userinfo[followee]) {
          return {
            name: userinfo[followee].displayname ? userinfo[followee].displayname : userinfo[followee].username,
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
    return this.httpService.get('assets/posts.json').toPromise().then(
      posts => {
        const followeePosts = [];
        for (const followee of this.followInfo.following) {
          if (posts[followee]) {
            followeePosts.push.apply(followeePosts, posts[followee]);
            console.log(followee + ' ' + followeePosts.length);
          }
        }
        return followeePosts;
      }
    );
  }
}
