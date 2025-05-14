import * as nodemailer from 'nodemailer';

declare module 'nodemailer' {
  interface Attachment {
    /** String, Buffer or a Stream contents for the attachment */
    content?: string | Buffer | NodeJS.ReadableStream;
    /** Path to a file or an URL (data URIs are allowed as well) if you want to stream the file instead of including it (better for larger attachments) */
    path?: string;
    /** filename to be reported as the name of the attached file, use of unicode is allowed */
    filename?: string;
    /** optional content type for the attachment, if not set will be derived from the filename property */
    contentType?: string;
    /** optional content disposition type for the attachment, defaults to 'attachment' */
    contentDisposition?: string;
    /** optional content id for using inline images in HTML message source */
    cid?: string;
    /** optional encoding for the attachment */
    encoding?: string;
    /** is an attachment accessible only via URL */
    href?: string;
    /** optional HTTP headers for an URL request if href is set */
    httpHeaders?: { [key: string]: string };
    /** if set and content is string, then encodes the content to a Buffer using the specified encoding */
    contentTransferEncoding?: '7bit' | 'base64' | 'quoted-printable';
    /** optional headers for the attachment node */
    headers?: { [key: string]: string | number | boolean };
    /** optional content-related metadata object */
    related?: any;
  }
}
