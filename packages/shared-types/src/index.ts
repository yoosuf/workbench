export enum Engine {
  MYSQL = 'MYSQL',
  POSTGRES = 'POSTGRES',
}

export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthPayload {
  accessToken: string;
  user: UserDto;
}
