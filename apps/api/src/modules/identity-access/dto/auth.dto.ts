import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field(() => String)
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
