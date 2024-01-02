import type { APIRoute } from "astro";
import { SMTPClient } from "emailjs";
import { intern, response } from "@/lib/email-templates";

const EMAIL_USER = import.meta.env.EMAIL_USER;
const EMAIL_PASS = import.meta.env.EMAIL_PASS;
const EMAIL_RECIVER = import.meta.env.EMAIL_RECIVER;

const client = new SMTPClient({
  user: EMAIL_USER,
  password: EMAIL_PASS,
  host: "smtp.ionos.es",
  ssl: true,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.json();

    console.log({ formData, EMAIL_USER });

    const internMessage = {
      from: `Espai La Kalma Web <${EMAIL_USER}>`,
      to: `Espai La Kalma <${EMAIL_USER}>`,
      subject: `${formData.fullname} ha contactado`,
      text: "Email from website",
      attachment: {
        data: intern(formData),
        alternative: true,
      },
    };

    const responseMessage = {
      from: `Espai La Kalma Web <${EMAIL_USER}>`,
      to: `${formData.fullname} <${formData.email}>`,
      "reply-to": `Espai La Kalma <${EMAIL_RECIVER}>`,
      subject: `${formData.fullname}, gracias por contactar con nosotros`,
      text: "Gracias por ponerte en contacto con Espai la Kalma. Apreciamos tu interés. En breves nos comunicaremos contigo.",
      attachment: {
        data: response(formData),
        alternative: true,
      },
    };

    await client.sendAsync(internMessage);
    await client.sendAsync(responseMessage);

    return new Response(JSON.stringify({ message: "Done" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error }), {
      status: 400,
    });
  }
};
