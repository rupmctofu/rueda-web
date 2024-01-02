export type FormData = {
  fullname: string;
  phone: string;
  email: string;
  referal: string;
  message: string;
};

export const intern = (data: FormData) => /* html */ `
<html>
  <head>
    <style>
      html,
      body {
        font-family: sans-serif;
      }
      small {
        font-family: monospace;
        color: gray;
      }
      p {
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <h1>Nuevo contacto ⚡</h1>
    <div>
      <small>NOMBRE COMPLETO</small>
      <p>${data.fullname}</p>
    </div>
    <hr>
    <div>
      <small>EMAIL</small>
      <p>${data.email}</p>
    </div>
    <hr>
    <div>
      <small>MESSAGE</small>
      <p>${data.message}</p>
    </div>
    <hr>
  <body>
</html>
`;

export const response = (data: FormData) => /* html */ `
<!DOCTYPE HTML
  PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:o="urn:schemas-microsoft-com:office:office">

<head>
  <!--[if gte mso 9]>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    <![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <title>Espai La Kalma</title>
  <style type="text/css">
    p,
    p:visited {
      /* Fallback paragraph style */
      font-size: 15px;
      line-height: 24px;
      font-family: 'Helvetica', Arial, sans-serif;
      font-weight: 300;
      text-decoration: none;
      color: #000000;
    }

    h1 {
      font-size: 22px;
      line-height: 24px;
      font-family: 'Helvetica', Arial, sans-serif;
      font-weight: normal;
      text-decoration: none;
      color: #000000;
    }

    .ExternalClass p,
    .ExternalClass span,
    .ExternalClass font,
    .ExternalClass td {
      line-height: 100%;
    }

    .ExternalClass {
      width: 100%;
    }
  </style>
</head>

<body
  style="text-align: center; margin: 0; padding-top: 20px; padding-bottom: 10px; padding-left: 0; padding-right: 0; -webkit-text-size-adjust: 100%;background-color: #ffffff; color: #000000"
  align="center">
  <div style="text-align: center;">
    <table align="center"
      style="text-align: center; vertical-align: top; width: 600px; max-width: 600px; background-color: #eeeeee;"
      width="600">
      <tbody>
        <tr>
          <td
            style="width: 596px; vertical-align: top; padding-left: 0; padding-right: 0; padding-top: 30px; padding-bottom: 15px; border-bottom: 1px solid #eeeeee;"
            width="596">
            <!-- Logo -->
            <img
                style="width: 100px; max-width: 100px; height: 100px; max-height: 100px; text-align: center; color: #000000;"
                alt="Espai La Kalma"
                src="https://www.espailakalmashamanic.com/mobile.png"
                align="center"
                width="100"
                height="100"
              >
          </td>
        </tr>
      </tbody>
    </table>
    <table align="center"
      style="text-align: center; vertical-align: top; width: 600px; max-width: 600px; background-color: #eeeeee;"
      width="600">
      <tbody>
        <tr>
          <td
            style="width: 596px; vertical-align: top; padding-left: 30px; padding-right: 30px; padding-top: 30px; padding-bottom: 40px;"
            width="596">
            <h1
              style="font-size: 20px; line-height: 24px; font-family: 'Helvetica', Arial, sans-serif; font-weight: 600; text-decoration: none; color: #000000;">
              ${data.fullname},
              <br />
              gracias por ponerte en contacto con Espai la Kalma,
            </h1>
            <p
              style="font-size: 15px; line-height: 24px; font-family: 'Helvetica', Arial, sans-serif; font-weight: 400; text-decoration: none; color: #999999;">
              Apreciamos tu interés. En breves nos comunicaremos contigo.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</body>

</html>
`;
