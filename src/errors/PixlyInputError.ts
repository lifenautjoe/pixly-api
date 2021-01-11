import PixlyError from './PixlyError';

class PixlyInputError extends PixlyError {
  public message: string;

  constructor(message: string) {
    super(message);
    this.message = message;
  }
}

export default PixlyInputError;
