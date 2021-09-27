CREATE TABLE "chat"."Subscription"("chatId" uuid NOT NULL, "attendeeId" uuid NOT NULL, "wasManuallySubscribed" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("chatId","attendeeId") , FOREIGN KEY ("chatId") REFERENCES "chat"."Chat"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("attendeeId") REFERENCES "public"."Attendee"("id") ON UPDATE cascade ON DELETE cascade);