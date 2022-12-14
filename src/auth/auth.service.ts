import { Body, Injectable, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginUserDto } from './dto/login-user.dto';
import { SignUpUserDto } from './dto/signup-user.dto';
import { User } from 'src/user/entities/user.entity';
import { TokenExpiredErrorException } from 'src/lib/exceptions/TokenExpiredError.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  @Post('signup')
  async signup(@Body() signUpUserDto: SignUpUserDto) {
    return this.userService.save(signUpUserDto);
  }

  async validateSignup(email: string): Promise<User | null> {
    return await this.userService.findOne(email);
  }

  async validateLogin(email: string, password: string): Promise<any> {
    const user = await this.userService.findOne(email);
    if (user && user.password === password) {
      // need hashing
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: LoginUserDto) {
    const payload = await this.validateLogin(user.email, user.password);

    // 회원이 아닌 유저가 로그인 시도를 하였을 경우 예외 처리
    if (payload === null) {
      throw new UnauthorizedException();
    }

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async decodeToken(at: string) {
    return this.jwtService.decode(at);
  }

  async verifyToekn(at: string) {
    return this.jwtService.verifyAsync(at);
  }

  async verifyUser(at: string): Promise<User> {
    try {
      await this.verifyToekn(at);
      const parsedToken = (await this.decodeToken(at)) as {
        [key: string]: any;
        email: string;
      };
      return await this.userService.findOne(parsedToken.email);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredErrorException();
      }
      throw new Error('Sorry unexpected error is occurred!');
    }
  }
}
