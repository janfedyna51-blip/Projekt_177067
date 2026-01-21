#include <iostream>
#include <string>
 using namespace  std;
int main(int argc, char* argv[]) {
string numer;
    for(int i=1;i<argc;i++)
        {
            numer += argv[i];
        }
    int c;
    int w=0;
    int z=1;
    for(int i=0;i<10;i++)
        {
           c=int(numer[i]-48)*z;
            while(c>10)
                {
                    c-=10;
                }
            w+=c;
            while(w>10)
                {
                    w-=10;
                }
            if(z==1)
            {
                z=3;
            }
            else if(z==3)
                {
                    z=7;
                }
            else if(z==7)
                {
                    z=9;
                }
            else if(z==9)
                {
                    z=1;
                }
        }
    if(w!=int(numer[10]-48))
    {
        cout<< 1;
    }
    else{
        int r = int(numer[0]-48)*10+int(numer[1]-48);
        int m = int(numer[2]-48)*10+int(numer[3]-48);
        int aktualny_rok=2026;
        if(m>12)
        {
            r=r+2000;
        }
        else
        {
            r=r+1900;
        }
        if(aktualny_rok-r<18)
        {
            cout<< 1;
        }
        else
        {
            cout << 0;
        }
    }
    return 0;
}