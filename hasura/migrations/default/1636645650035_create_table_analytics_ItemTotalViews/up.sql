CREATE TABLE "analytics"."ItemTotalViews" ("itemId" uuid NOT NULL, "totalViewCount" bigint NOT NULL DEFAULT 0, PRIMARY KEY ("itemId") , FOREIGN KEY ("itemId") REFERENCES "content"."Item"("id") ON UPDATE cascade ON DELETE cascade, UNIQUE ("itemId"));
