import { EventEmitter, Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import { Router } from '@angular/router';
import { User } from 'src/app/_models/user';
import { AuthService } from 'src/app/auth/auth.service';
import { GlobalService } from 'src/app/_services';
import { Observable } from 'rxjs';

export interface FollowingUser {
  last_name: string;
  first_name: string;
  email: string;
  status: string;
  avatar: string;
}

export interface FollowInfo {
  // followers: Array<string>;
  following: Array<string>;
}

export interface FolloweeInfo {
  username: string;
  displayname: string;
  status: string;
  avatar: string;
}

interface ArticleResponse {
  articles: Array<Post>;
}

export interface Post {
  author: string;
  id: number;
  content: string;
  image: string;
  comments: Array<{ author: string, content: string }>;
  date: string;
}

export interface Comment {
  author: string;
  content: string;
  date: number;
  id: number;
  to_post: number;
}

interface NameResponse {
  username: string;
  displaynames: Array<{username: string, displayname: string}>;
}

interface HeadlineResponse {
  username: string;
  headline: string;
}

interface HeadlinesResponse {
  username: string;
  headlines: Array<{username: string, headline: string}>;
}

interface AvatarResponse {
  username: string;
  avatars: Array<{username: string, avatar: string}>;
}

interface ImageResponse {
  username: string;
  url: string;
}

interface SmartyStreetResponse {
  suggestions: Array<{text: string}>;
}

@Injectable({
  providedIn: 'root'
})
export class MainService {
  username: string;
  followInfo: FollowInfo;
  getDate: () => string = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  onRemove: EventEmitter<any> = new EventEmitter<any>();
  smartyStreet: string = 'https://us-autocomplete.api.smartystreets.com/suggest?' +
    'auth-id=14634588597451517&prefix=';

  constructor(
    private httpService: HttpClient,
    private authService: AuthService,
    private globalService: GlobalService,
    private router: Router
  ) { }

  getCurrentUser() {
    let username = '';
    try {
      if (localStorage.getItem('currentUser')) {
        const user: User = JSON.parse(localStorage.getItem('currentUser'));
        username = user.email;
      }
    } catch (e) {
      console.log('This browser does not support local storage.');
    }
    return username;
  }

  loadUsers(username: string): Promise<Array<FollowingUser>> {
    this.username = username;

    const request = this.httpService.get<Array<FollowingUser>>(
      this.globalService.serverURL + '/following',
      { headers: this.globalService.getHeaders() }
    );
    return request.toPromise().catch(error => {
      return this.router.navigate(['/auth/login']).then(() => {
        return [];
      });
    });
  }

  getFolloweeInfo(followee: Array<string>): Promise<Array<FolloweeInfo>> {
    const str = followee.join(',');
    let displaynames;
    let headlines;
    let avatars;

    return this.httpService.get<NameResponse>(
      this.globalService.serverURL + '/displaynames/:users?users=' + str,
      { headers: this.globalService.getHeaders() }
    ).toPromise().then(res1 => {
        displaynames = res1.displaynames;
        return this.httpService.get<HeadlinesResponse>(
          this.globalService.serverURL + '/headlines/:users?users=' + str,
          { headers: this.globalService.getHeaders() }
        ).toPromise().then(res2 => {
          headlines = res2.headlines;
          return this.httpService.get<AvatarResponse>(
            this.globalService.serverURL + '/avatars/:users?users=' + str,
            { headers: this.globalService.getHeaders() }
          ).toPromise().then(res3 => {
            avatars = res3.avatars;
          }).then(() => {
            const infos = [];
            for (let i = 0; i < followee.length; i++) {
              infos.push({
                username: followee[i],
                displayname: displaynames[i].displayname,
                status: headlines[i].headline,
                avatar: avatars[i].avatar
              });
            }
            return infos;
          });
        });
      }).catch(error => {
      return this.router.navigate(['/auth/login']).then(() => {
        return [];
      });
    });
  }

  loadPosts(): Promise<Array<Post>> {
    const request = this.httpService.get<Array<Post>>(
      this.globalService.serverURL + '/articles',
      {
        headers: this.globalService.getHeaders()
      }
    );
    return request.toPromise().then(res => {
        return this.sortPosts(res);
      }
    ).catch(error => {
      return this.router.navigate(['/auth/login']).then(() => {
        console.log(error);
        return [];
      });
    });
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
    // for (let i = 0; i < this.followInfo.following.length; i++) {
    //   if (this.followInfo.following[i] === username) {
    //     this.followInfo.following.splice(i, 1);
    //   }
    // }

    // write to server side file
    // remove this user from followee's followers' list
    const request = this.httpService.delete<FollowInfo>(
      this.globalService.serverURL + '/following/:user?user=' + username,
      { headers: this.globalService.getHeaders() }
    );
    return request.toPromise().then(res => {
      this.onRemove.emit();
      this.followInfo = res;
    }).catch(error => {
      return this.router.navigate(['/auth/login']);
    });
  }

  changeStatus(status: string) {
    try {
      if (localStorage.getItem('currentUser')) {
        const user: User = JSON.parse(localStorage.getItem('currentUser'));
        const newUser = {
          lastname: user.lastname,
          firstname: user.firstname,
          email: user.email,
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
    const request = this.httpService.put<HeadlineResponse>(
      this.globalService.serverURL + '/headline',
      { headline: status },
      { headers: this.globalService.getHeaders() }
    );
    return request.toPromise().then(res => {
      return res.headline;
    }).catch(error => {
      return this.router.navigate(['/auth/login']).then(() => {
        return '';
      });
    });
  }

  loadComments(id: number): Promise<Array<Comment>> {
    const request = this.httpService.get<Array<Comment>>(
      this.globalService.serverURL + '/articles/' + id,
      {
        headers: new HttpHeaders()
          .set('Token', this.authService.retrieveToken())
      }
    );
    return request.toPromise().then(res => {
      const comments = [];

      if (res && res.length > 0) {
        for (const comment of res) {
          comments.push({ commenter: comment.author, content: comment.content });
        }
      }
      return comments;
    }).catch(error => {
      return this.router.navigate(['/auth/login']).then(() => {
        return [];
      });
    });
  }

  uploadImage(image: File): Observable<ImageResponse> {
    const formData = new FormData();
    formData.append('image', image);
    return this.httpService.post<ImageResponse>(
      this.globalService.serverURL + '/image-upload',
      formData
    );
  }

  uploadPost(text, image) {
    const content = {
      'text': text,
      'image': image,
      'date': this.getDate()
    };
    const request = this.httpService.post<Array<Post>>(
      this.globalService.serverURL + '/articles',
      content,
      { headers: this.globalService.getHeaders() }
    );
    return request.toPromise().then(res => {
      return { articles: res };
    }).catch(error => {
      console.log(error);
      return this.router.navigate(['/auth/login']).then(() => {
        return { articles: [] };
      });
    });
  }

  editPost(id: number, text: string) {
    const request = this.httpService.put<ArticleResponse>(
      this.globalService.serverURL + '/articles/:id?id=' + id,
      { id, text },
      { headers: this.globalService.getHeaders() }
    );
    return request.toPromise().then(res => {
      return true;
    }).catch(error => {
      return false;
    });
  }

  commentPost(id: number, text: string) {
    const context = {
      to_post: id,
      content: text,
      date: this.getDate()
    };

    return this.loadComments(id).then(comments => {
      const request = this.httpService.post<ArticleResponse>(
        this.globalService.serverURL + '/articles/' + id,
        context,
        { headers: this.globalService.getHeaders() }
      );
      return request.toPromise().then(res => {
      }).catch(error => {
        console.log(error);
      });
    });
  }

  suggestAddress(prefix: string): Promise<string[]> {
    const request = this.httpService.get<SmartyStreetResponse>(
      this.smartyStreet + prefix
    );
    return request.toPromise().then(res => {
      if (!res || !res.suggestions) {
        return [];
      }
      return res.suggestions.map(suggestion => suggestion.text);
    }).catch(error => {
      console.log('SmartyStreet: ' + error);
      return [];
    });
  }
}
