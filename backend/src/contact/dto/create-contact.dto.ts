import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const CONTACT_INTERESTS = [
  'A live demo',
  'Clinical evaluation / research partnership',
  'Integration with our theatre stack',
  'Careers at DeepSurg',
  'Something else',
] as const;

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organisation!: string;

  @IsIn(CONTACT_INTERESTS as unknown as string[])
  interest!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}
