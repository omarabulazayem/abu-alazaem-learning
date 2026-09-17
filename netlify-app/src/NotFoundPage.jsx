import React from "react";
import {AppShell,Button,Empty,FAMILY_NAV,go} from "./ui-v4.jsx";
export default function NotFoundPage(){return <AppShell mode="public" subtitle="الصفحة غير موجودة" nav={FAMILY_NAV} footer="أبو العزايم • ارجع لمسار واضح وكمّل رحلتك."><Empty icon="search" title="الصفحة غير موجودة" text="الرابط غير معروف في المنصة أو الميزة ليست متاحة بعد." action={<Button icon="home" onClick={()=>go("/")}>العودة للرئيسية</Button>}/></AppShell>;}
