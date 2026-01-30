#include <iostream>   
#include <cstdlib>    
#include <ctime> 
char kol[53];
using namespace std;
int  main()
  {
    int ile[13] = { 0 }, iz;

    srand(time(NULL));
    for (iz = 0; iz < 52; iz++)
    {
      int l = 0;
      l = (rand() % 13) + 1;
      while (ile[l - 1] >= 4)
      {
        l = rand() % 13 + 1;
      }
      ile[l - 1] += 1;
      if (l >= 2 && l < 10)
      {
        kol[iz] = l + 48;
      }
      else if (l == 1)
      {
        kol[iz] = 'A';
      }
      else if (l == 11)
      {
        kol[iz] = 'J';
      }
      else if (l == 12)
      {
        kol[iz] = 'Q';
      }
      else if (l == 13)
      {
        kol[iz] = 'K';
      }
      else if (l == 10)
      {
        kol[iz] = 'D';
      }
    }
    kol[52] = '\0';
  cout << kol;
  return 0;
  }