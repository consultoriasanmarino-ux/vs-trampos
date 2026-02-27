from supabase import create_client, Client
import json

SUPABASE_URL = "https://bvtfassziymdsftkytmq.supabase.co"
SUPABASE_KEY = "sb_publishable_Qyp_63NubEeU7T0KnAC4tg_U7qz-o91"

def check():
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        response = supabase.table("clientes").select("telefone, wpp_checked").eq("wpp_checked", True).limit(5).execute()
        print(f"DEBUG_DATA:{json.dumps(response.data)}")
    except Exception as e:
        print(f"DEBUG_ERROR:{e}")

if __name__ == "__main__":
    check()
